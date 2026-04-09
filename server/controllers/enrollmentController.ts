import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

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

        if (!studentDoc.exists || studentDoc.data()?.role !== 'student') {
            return res.status(400).json({ error: 'Invalid studentId.' });
        }
        if (!courseDoc.exists) {
            return res.status(400).json({ error: 'Invalid courseId.' });
        }
        if (courseDoc.data()?.isOpen !== true) {
            return res.status(409).json({ error: 'Enrollment is closed for this course.' });
        }

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
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Enrollment ID is required' });
        }

        await db.collection('enrollments').doc(String(id)).delete();
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
