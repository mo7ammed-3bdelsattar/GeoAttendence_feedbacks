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

    const studentId = String(payload.studentId);
    const studentDoc = await db.collection('users').doc(studentId).get();
    const isDevStudentId = studentId.startsWith('dev-');
    const studentRole = String(studentDoc.data()?.role || '').toLowerCase();
    const normalizedStudentRole =
      studentRole === 'faculty' || studentRole === 'instructor' || studentRole === 'doctor'
        ? 'faculty'
        : studentRole || 'student';
    if ((!studentDoc.exists && !isDevStudentId) || (studentDoc.exists && normalizedStudentRole !== 'student')) {
      return res.status(400).json({ error: 'studentId must belong to a student user.' });
    }

    const courseDoc = await db.collection('courses').doc(String(payload.courseId)).get();
    if (!courseDoc.exists) {
      return res.status(400).json({ error: 'Invalid courseId.' });
    }

    const courseId = String(payload.courseId);
    const [existingCamelCase, existingSnakeCase] = await Promise.all([
      db
        .collection('feedback')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .limit(1)
        .get(),
      db
        .collection('feedback')
        .where('student_id', '==', studentId)
        .where('course_id', '==', courseId)
        .limit(1)
        .get()
    ]);
    if (!existingCamelCase.empty || !existingSnakeCase.empty) {
      return res.status(409).json({ error: 'You have already submitted feedback for this course.' });
    }

    const feedbackData = {
      studentId,
      courseId,
      student_id: studentId,
      course_id: courseId,
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

    const [camelCaseSnapshot, snakeCaseSnapshot] = await Promise.all([
      db.collection('feedback').where('studentId', '==', studentId).get(),
      db.collection('feedback').where('student_id', '==', studentId).get()
    ]);
    const feedbackMap = new Map<string, any>();
    [...camelCaseSnapshot.docs, ...snakeCaseSnapshot.docs].forEach((doc) => {
      feedbackMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    const feedback = Array.from(feedbackMap.values()).sort((a, b) =>
      String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
    );
    return res.json(feedback);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteFeedbackById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || !id.trim()) {
      return res.status(400).json({ error: 'feedback id is required.' });
    }

    const feedbackRef = db.collection('feedback').doc(id);
    const feedbackSnap = await feedbackRef.get();
    if (!feedbackSnap.exists) {
      return res.status(404).json({ error: 'Feedback not found.' });
    }

    await feedbackRef.delete();
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};