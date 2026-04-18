import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

type StudentScheduleRow = {
    courseId: string;
    courseName: string;
    instructorName: string;
    day: string;
    time: string;
};

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return Number.MAX_SAFE_INTEGER;
    return h * 60 + m;
}

function resolveDayLabel(session: any): string {
    if (typeof session.day === 'string' && session.day.trim()) return session.day.trim();
    if (typeof session.date === 'string' && session.date.trim()) {
        const d = new Date(session.date);
        if (!Number.isNaN(d.getTime())) {
            return d.toLocaleDateString('en-US', { weekday: 'long' });
        }
    }
    return 'Unscheduled';
}

function sortScheduleRows(rows: StudentScheduleRow[]): StudentScheduleRow[] {
    return [...rows].sort((a, b) => {
        const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;

        const aStart = toMinutes(a.time.split(' - ')[0] ?? '');
        const bStart = toMinutes(b.time.split(' - ')[0] ?? '');
        if (aStart !== bStart) return aStart - bStart;

        return a.courseName.localeCompare(b.courseName);
    });
}

/**
 * Controller for Student Schedule Management
 */
export const studentScheduleController = {
    
    /**
     * POST /student/courses
     * Synchronizes student courselist using a Transaction to ensure consistency and unique enrollment.
     */
    saveCourses: async (req: Request, res: Response) => {
        try {
            const { studentId, courseIds } = req.body;

            if (!studentId || !Array.isArray(courseIds)) {
                return res.status(400).json({ error: 'studentId and unique courseIds array required.' });
            }

            // Remove duplicates from incoming list (Frontend should also handle this)
            const uniqueCourseIds = Array.from(new Set(courseIds));

            await db.runTransaction(async (transaction) => {
                const enrollCol = db.collection('student_courses');
                
                // 1. Find all existing courses for this student
                const existingSnap = await transaction.get(
                    enrollCol.where('student_id', '==', studentId)
                );

                // 2. Clear previous selections
                existingSnap.docs.forEach(doc => {
                    transaction.delete(doc.ref);
                });

                // 3. Add new selections (Atomic insert)
                for (const cid of uniqueCourseIds) {
                    const newRef = enrollCol.doc();
                    transaction.set(newRef, {
                        student_id: studentId,
                        course_id: cid,
                        created_at: new Date().toISOString()
                    });
                }
            });

            res.json({ success: true, message: 'Schedule updated successfully.' });
        } catch (error: any) {
            console.error('[StudentSchedule] Sync failed:', error);
            res.status(500).json({ error: 'Failed to synchronize courses.', details: error.message });
        }
    },

    /**
     * GET /student/schedule
     * Fetches a personalized structured timetable with day grouping and conflict detection.
     */
    getSchedule: async (req: Request, res: Response) => {
        try {
            const { studentId } = req.query;
            if (!studentId) return res.status(400).json({ error: 'studentId required' });

            // 1. Fetch Enrolled Course IDs
            const enrollSnap = await db.collection('student_courses')
                .where('student_id', '==', studentId)
                .get();
            
            const myCourseIds = enrollSnap.docs.map(doc => doc.data().course_id);
            if (myCourseIds.length === 0) {
                return res.json({ timetable: {}, total: 0 });
            }

            // 2. Fetch Sessions using optimized chunking (Firestore IN query)
            let sessions: any[] = [];
            for (let i = 0; i < myCourseIds.length; i += 30) {
                const chunk = myCourseIds.slice(i, i + 30);
                const snap = await db.collection('sessions')
                    .where('courseId', 'in', chunk) // Mapping courseId to course_id if needed
                    .get();
                snap.docs.forEach(d => sessions.push({ id: d.id, ...d.data() }));
            }

            if (sessions.length === 0) {
                console.warn(`[StudentSchedule] No sessions found for course set: ${myCourseIds.join(',')}`);
            }

            // 3. Simulated JOIN: Populate Course and Instructor Metadata
            const [coursesSnap, usersSnap] = await Promise.all([
                db.collection('courses').get(),
                db.collection('users').get()
            ]);

            const coursesMap = Object.fromEntries(coursesSnap.docs.map(d => [d.id, d.data()]));
            const usersMap = Object.fromEntries(usersSnap.docs.map(d => [d.id, d.data()]));

            const sessionsWithMeta = sessions.map(s => {
                // Determine day name (support both 'day' field and 'date' field)
                const day = s.day || (s.date ? new Date(s.date).toLocaleDateString('en-US', { weekday: 'long' }) : 'Unscheduled');
                
                return {
                    id: s.id,
                    course_id: s.courseId,
                    course_name: coursesMap[s.courseId]?.name || 'Unknown Course',
                    course_code: coursesMap[s.courseId]?.code || '???',
                    instructor_name: usersMap[s.facultyId]?.name || 'Unknown Instructor',
                    start_time: s.startTime || s.start_time,
                    end_time: s.endTime || s.end_time,
                    location: s.location || s.classroomName || 'TBD',
                    day,
                    hasConflict: false
                };
            });

            // 4. Sort and Detect Time Conflicts
            // Sort by day order then start time
            const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            sessionsWithMeta.sort((a, b) => {
                if (a.day !== b.day) return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
                return (a.start_time || '').localeCompare(b.start_time || '');
            });

            for (let i = 0; i < sessionsWithMeta.length; i++) {
                for (let j = i + 1; j < sessionsWithMeta.length; j++) {
                    const s1 = sessionsWithMeta[i];
                    const s2 = sessionsWithMeta[j];
                    if (s1.day === s2.day && s1.day !== 'Unscheduled') {
                        // Temporal overlap check
                        if (s1.start_time < s2.end_time && s2.start_time < s1.end_time) {
                            sessionsWithMeta[i].hasConflict = true;
                            sessionsWithMeta[j].hasConflict = true;
                        }
                    }
                }
            }

            // 5. Build Grouped Timetable structure
            const timetable: Record<string, any[]> = {};
            sessionsWithMeta.forEach(s => {
                if (!timetable[s.day]) timetable[s.day] = [];
                timetable[s.day].push(s);
            });

            res.json({
                timetable,
                sessions: sessionsWithMeta,
                total: sessionsWithMeta.length
            });

        } catch (error: any) {
            res.status(500).json({ error: 'Failed to generate schedule.', message: error.message });
        }
    }
};

export const getMySchedule = async (req: Request, res: Response) => {
    try {
        const currentUser = (req as any).currentUser as { uid?: string; role?: string } | undefined;
        const studentId = currentUser?.uid;
        if (!studentId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const enrollSnap = await db.collection('enrollments').where('studentId', '==', studentId).get();
        const courseIds = Array.from(new Set(enrollSnap.docs.map((doc) => String(doc.data().courseId || '')))).filter(Boolean);
        if (courseIds.length === 0) {
            return res.json([]);
        }

        const [coursesSnap, usersSnap] = await Promise.all([
            db.collection('courses').get(),
            db.collection('users').where('role', '==', 'faculty').get()
        ]);
        const coursesMap = Object.fromEntries(coursesSnap.docs.map((doc) => [doc.id, doc.data()]));
        const instructorsMap = Object.fromEntries(usersSnap.docs.map((doc) => [doc.id, doc.data()]));

        const sessions: any[] = [];
        for (let i = 0; i < courseIds.length; i += 30) {
            const chunk = courseIds.slice(i, i + 30);
            const sessionSnap = await db.collection('sessions').where('courseId', 'in', chunk).get();
            sessionSnap.docs.forEach((doc) => sessions.push({ id: doc.id, ...doc.data() }));
        }

        const rows: StudentScheduleRow[] = sessions.map((session) => {
            const course = coursesMap[session.courseId] as { name?: string; facultyId?: string } | undefined;
            const instructor = instructorsMap[session.facultyId || course?.facultyId] as { name?: string } | undefined;
            const startTime = session.startTime || session.start_time || '';
            const endTime = session.endTime || session.end_time || '';

            return {
                courseId: String(session.courseId || ''),
                courseName: String(course?.name || session.courseName || 'Unknown Course'),
                instructorName: String(instructor?.name || 'Unknown Instructor'),
                day: resolveDayLabel(session),
                time: startTime && endTime ? `${startTime} - ${endTime}` : 'TBD'
            };
        });

        const deduped = Array.from(
            new Map(rows.map((row) => [`${row.courseId}-${row.day}-${row.time}`, row])).values()
        );
        return res.json(sortScheduleRows(deduped));
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to load schedule.', message: error.message });
    }
};

export const getStudentCourses = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        if (!studentId) {
            return res.status(400).json({ error: 'studentId required' });
        }

        const enrollSnap = await db.collection('enrollments')
            .where('studentId', '==', studentId)
            .get();

        const courseIds = Array.from(new Set(enrollSnap.docs.map((doc) => doc.data().courseId)));
        if (courseIds.length === 0) {
            return res.json([]);
        }

        let courses: any[] = [];
        for (let i = 0; i < courseIds.length; i += 30) {
            const chunk = courseIds.slice(i, i + 30);
            const snap = await db.collection('courses').where('__name__', 'in', chunk).get();
            snap.docs.forEach((doc) => courses.push({ id: doc.id, ...doc.data() }));
        }

        return res.json(courses);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const getStudentDashboard = async (req: Request, res: Response) => {
    const emptyPayload = {
        courses: [],
        sessions: [],
        feedbackCount: 0
    };

    try {
        const { studentId } = req.params;
        if (!studentId) {
            return res.status(200).json(emptyPayload);
        }

        const enrollSnap = await db.collection('enrollments')
            .where('studentId', '==', studentId)
            .get();

        const courseIds = Array.from(new Set(enrollSnap.docs.map((doc) => doc.data().courseId)));
        if (courseIds.length === 0) {
            const [feedbackCamelCaseSnapshot, feedbackSnakeCaseSnapshot] = await Promise.all([
                db.collection('feedback').where('studentId', '==', studentId).get(),
                db.collection('feedback').where('student_id', '==', studentId).get()
            ]);
            const feedbackIds = new Set([
                ...feedbackCamelCaseSnapshot.docs.map((doc) => doc.id),
                ...feedbackSnakeCaseSnapshot.docs.map((doc) => doc.id)
            ]);
            return res.status(200).json({
                ...emptyPayload,
                feedbackCount: feedbackIds.size
            });
        }

        let courses: any[] = [];
        let sessions: any[] = [];
        for (let i = 0; i < courseIds.length; i += 30) {
            const chunk = courseIds.slice(i, i + 30);
            const [courseSnap, sessionSnap] = await Promise.all([
                db.collection('courses').where('__name__', 'in', chunk).get(),
                db.collection('sessions').where('courseId', 'in', chunk).get()
            ]);
            courseSnap.docs.forEach((doc) => courses.push({ id: doc.id, ...doc.data() }));
            sessionSnap.docs.forEach((doc) => sessions.push({ id: doc.id, ...doc.data() }));
        }

        const courseMap = Object.fromEntries(courses.map((course) => [course.id, course]));
        const normalizedSessions = sessions.map((session) => ({
            ...session,
            courseName: session.courseName || courseMap[session.courseId]?.name || 'Unknown Course'
        }));

        const [feedbackCamelCaseSnapshot, feedbackSnakeCaseSnapshot] = await Promise.all([
            db.collection('feedback').where('studentId', '==', studentId).get(),
            db.collection('feedback').where('student_id', '==', studentId).get()
        ]);
        const feedbackIds = new Set([
            ...feedbackCamelCaseSnapshot.docs.map((doc) => doc.id),
            ...feedbackSnakeCaseSnapshot.docs.map((doc) => doc.id)
        ]);
        return res.status(200).json({
            courses,
            sessions: normalizedSessions,
            feedbackCount: feedbackIds.size
        });
    } catch (error: any) {
        console.error('[student dashboard] failed:', error?.message || error);
        return res.status(200).json(emptyPayload);
    }
};
