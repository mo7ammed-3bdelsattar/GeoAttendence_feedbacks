import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';
import { getAuthenticatedUser } from '../middleware/authGuard';

const UNENROLL_WINDOW_HOURS = Number(process.env.UNENROLL_WINDOW_HOURS ?? 24);
const UNENROLL_WINDOW_MS = (Number.isFinite(UNENROLL_WINDOW_HOURS) && UNENROLL_WINDOW_HOURS > 0 ? UNENROLL_WINDOW_HOURS : 24) * 60 * 60 * 1000;

/**
 * Get all enrollments or filter by studentId or courseId
 */
export const getEnrollments = async (req: Request, res: Response) => {
    try {
        const { studentId, courseId } = req.query;
        let query: FirebaseFirestore.Query = db.collection('enrollments');

        if (studentId) {
            query = query.where('studentId', '==', String(studentId));
        }
        if (courseId) {
            query = query.where('courseId', '==', String(courseId));
        }

        const snapshot = await query.get();
        const enrollments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(enrollments);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Enroll a student in a course
 */
export const enrollStudent = async (req: Request, res: Response) => {
    try {
        const { studentId, courseId } = req.body;

        if (!studentId || !courseId) {
            return res.status(400).json({ error: 'studentId and courseId are required' });
        }

        const [studentDoc, courseDoc] = await Promise.all([
            db.collection('users').doc(String(studentId)).get(),
            db.collection('courses').doc(String(courseId)).get()
        ]);

        const isDevStudentId = String(studentId).startsWith('dev-');
        const studentRole = String(studentDoc.data()?.role || '').toLowerCase();
        const normalizedStudentRole =
            studentRole === 'faculty' || studentRole === 'instructor' || studentRole === 'doctor'
                ? 'faculty'
                : studentRole || 'student';

        // Allow synthetic dev users (dev-*) created by the mock/dev login flow.
        if ((!studentDoc.exists && !isDevStudentId) || (studentDoc.exists && normalizedStudentRole !== 'student')) {
            return res.status(400).json({ error: 'Invalid studentId.' });
        }
        if (!courseDoc.exists) {
            return res.status(400).json({ error: 'Invalid courseId.' });
        }
        // Enrollment is now open for students regardless of course "isOpen" state.

        // Check if enrollment already exists
        const existing = await db.collection('enrollments')
            .where('studentId', '==', studentId)
            .where('courseId', '==', courseId)
            .get();

        if (!existing.empty) {
            return res.status(400).json({ error: 'Student is already enrolled in this course' });
        }

        const newEnrollment = {
            studentId,
            courseId,
            enrolledAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        };

        const docRef = await db.collection('enrollments').add(newEnrollment);
        res.status(201).json({ id: docRef.id, ...newEnrollment });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getEnrollmentsByStudent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Student ID is required' });
        }

        const snapshot = await db.collection('enrollments').where('studentId', '==', String(id)).get();
        const enrollments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(enrollments);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Unenroll a student from a course
 */
export const unenrollStudent = async (req: Request, res: Response) => {
    try {
        const { id: courseId } = req.params;
        if (!courseId) {
            return res.status(400).json({ error: 'Course ID is required' });
        }

        const currentUser = getAuthenticatedUser(req);
        if (!currentUser?.uid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (currentUser.role && currentUser.role !== 'student') {
            return res.status(403).json({ error: 'Forbidden: Student access only.' });
        }

        const enrollmentSnap = await db.collection('enrollments')
            .where('studentId', '==', currentUser.uid)
            .where('courseId', '==', String(courseId))
            .limit(1)
            .get();

        if (enrollmentSnap.empty) {
            return res.status(404).json({ error: 'Enrollment not found for this course.' });
        }

        const enrollmentDoc = enrollmentSnap.docs[0];
        const enrollmentData = enrollmentDoc.data() as { enrolledAt?: string; createdAt?: string } | undefined;
        const enrolledAtRaw = enrollmentData?.enrolledAt || enrollmentData?.createdAt;
        if (!enrolledAtRaw) {
            return res.status(400).json({ error: 'Enrollment timestamp missing.' });
        }

        const enrolledAtMs = new Date(enrolledAtRaw).getTime();
        if (Number.isNaN(enrolledAtMs)) {
            return res.status(400).json({ error: 'Invalid enrollment timestamp.' });
        }

        const elapsedMs = Date.now() - enrolledAtMs;
        if (elapsedMs > UNENROLL_WINDOW_MS) {
            return res.status(403).json({ error: 'Unenrollment period expired (24 hours passed)' });
        }

        await enrollmentDoc.ref.delete();
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update an enrollment
 */
export const updateEnrollment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const payload = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Enrollment ID is required' });
        }

        const enrollmentId = String(id);
        await db.collection('enrollments').doc(enrollmentId).update(payload);
        const updated = await db.collection('enrollments').doc(enrollmentId).get();

        res.json({ id: updated.id, ...updated.data() });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getMyCourses = async (req: Request, res: Response) => {
    try {
        const currentUser = getAuthenticatedUser(req);
        if (!currentUser?.uid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (currentUser.role && currentUser.role !== 'student') {
            return res.status(403).json({ error: 'Forbidden: Student access only.' });
        }

        const enrollmentSnap = await db.collection('enrollments').where('studentId', '==', currentUser.uid).get();
        const courseIds = Array.from(new Set(enrollmentSnap.docs.map((doc) => String(doc.data().courseId || '')))).filter(Boolean);
        if (courseIds.length === 0) {
            return res.json([]);
        }

        const [coursesSnap, facultySnap] = await Promise.all([
            db.collection('courses').get(),
            db.collection('users').where('role', '==', 'faculty').get()
        ]);
        const courseMap = Object.fromEntries(coursesSnap.docs.map((doc) => [doc.id, doc.data()]));
        const facultyMap = Object.fromEntries(facultySnap.docs.map((doc) => [doc.id, doc.data()]));

        const sessions: any[] = [];
        for (let i = 0; i < courseIds.length; i += 30) {
            const chunk = courseIds.slice(i, i + 30);
            const sessionSnap = await db.collection('sessions').where('courseId', 'in', chunk).get();
            sessionSnap.docs.forEach((doc) => sessions.push({ id: doc.id, ...doc.data() }));
        }

        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Unscheduled'];
        const rows = sessions.map((session) => {
            const course = courseMap[session.courseId] as { name?: string; facultyId?: string } | undefined;
            const faculty = facultyMap[session.facultyId || course?.facultyId] as { name?: string } | undefined;
            const day = session.day
                ? String(session.day)
                : session.date
                    ? new Date(session.date).toLocaleDateString('en-US', { weekday: 'long' })
                    : 'Unscheduled';
            const startTime = String(session.startTime || session.start_time || '');
            const endTime = String(session.endTime || session.end_time || '');
            return {
                courseId: String(session.courseId),
                courseName: String(course?.name || session.courseName || 'Unknown Course'),
                instructorName: String(faculty?.name || 'Unknown Instructor'),
                day,
                time: startTime && endTime ? `${startTime} - ${endTime}` : 'TBD'
            };
        });

        const deduped = Array.from(new Map(rows.map((r) => [`${r.courseId}-${r.day}-${r.time}`, r])).values());
        deduped.sort((a, b) => {
            const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
            if (dayDiff !== 0) return dayDiff;
            return a.time.localeCompare(b.time);
        });

        return res.json(deduped);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};
