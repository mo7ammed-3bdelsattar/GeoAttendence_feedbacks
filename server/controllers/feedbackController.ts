import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';
import { validateFeedbackPayload } from '../models/feedbackModel';

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const payload = req.body as {
      studentId?: string;
      courseId?: string;
      rating?: number;
      message?: string;
    };
    const validation = validateFeedbackPayload(payload);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    const studentDoc = await db.collection('users').doc(String(payload.studentId)).get();
    if (!studentDoc.exists || studentDoc.data()?.role !== 'student') {
      return res.status(400).json({ error: 'studentId must belong to a student user.' });
    }

    const courseDoc = await db.collection('courses').doc(String(payload.courseId)).get();
    if (!courseDoc.exists) {
      return res.status(400).json({ error: 'Invalid courseId.' });
    }

    const existing = await db
      .collection('feedback')
      .where('studentId', '==', String(payload.studentId))
      .where('courseId', '==', String(payload.courseId))
      .limit(1)
      .get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'You have already submitted feedback for this course.' });
    }

    const feedbackData = {
      studentId: String(payload.studentId),
      courseId: String(payload.courseId),
      rating: Number(payload.rating),
      message: payload.message?.trim() ?? '',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('feedback').add(feedbackData);
    res.status(201).json({ id: docRef.id, ...feedbackData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllFeedback = async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('feedback').orderBy('createdAt', 'desc').get();
    const feedback = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(feedback);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getFeedbackByCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const snapshot = await db.collection('feedback').where('courseId', '==', courseId).get();
    const feedback = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(feedback);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getFeedbackByFaculty = async (req: Request, res: Response) => {
  try {
    const { facultyId } = req.params;
    const coursesSnapshot = await db.collection('courses').where('facultyId', '==', facultyId).get();
    const courses = coursesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (courses.length === 0) {
      return res.json({
        courses: [],
        summary: { totalFeedbacks: 0, overallAverage: 0 }
      });
    }

    const courseFeedback = await Promise.all(
      courses.map(async (course) => {
        const feedbackSnapshot = await db.collection('feedback').where('courseId', '==', course.id).get();
        const feedback = feedbackSnapshot.docs.map((doc) => {
          const data = doc.data() as { rating?: number; message?: string; createdAt?: string };
          return {
            id: doc.id,
            rating: Number(data.rating ?? 0),
            message: data.message ?? '',
            createdAt: data.createdAt ?? null
          };
        });

        const total = feedback.length;
        const ratingSum = feedback.reduce((sum, row) => sum + row.rating, 0);
        const averageRating = total > 0 ? Number((ratingSum / total).toFixed(1)) : 0;
        return {
          courseId: course.id,
          courseName: (course as any).name ?? 'Unknown Course',
          courseCode: (course as any).code ?? 'N/A',
          averageRating,
          feedbackCount: total,
          feedback
        };
      })
    );

    const totalFeedbacks = courseFeedback.reduce((sum, row) => sum + row.feedbackCount, 0);
    const overallAverage = totalFeedbacks > 0
      ? Number(
          (
            courseFeedback.reduce((sum, row) => sum + row.averageRating * row.feedbackCount, 0) / totalFeedbacks
          ).toFixed(1)
        )
      : 0;

    res.json({
      courses: courseFeedback,
      summary: { totalFeedbacks, overallAverage }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getFeedbackByStudent = async (req: Request, res: Response) => {
  try {
    const { id: studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required.' });
    }

    const snapshot = await db.collection('feedback').where('studentId', '==', studentId).orderBy('createdAt', 'desc').get();
    const feedback = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json(feedback);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};