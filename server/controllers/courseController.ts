import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';
import { USE_MOCK_AUTH, MOCK_USERS } from './userController';

export const getCourses = async (req: Request, res: Response) => {
  try {
    const { open } = req.query;
    let query: FirebaseFirestore.Query = db.collection('courses');
    if (open === 'true') {
      query = query.where('isOpen', '==', true);
    } else if (open === 'false') {
      query = query.where('isOpen', '==', false);
    }

    const snapshot = await query.get();
    
    // Enrich courses with faculty names
    const facultyIds = Array.from(new Set(snapshot.docs.map(doc => doc.data().facultyId).filter(Boolean)));
    let facultyMap: Record<string, any> = {};
    
    if (facultyIds.length > 0) {
        const facultyDocs = await db.getAll(...facultyIds.map(id => db.collection('users').doc(String(id))));
        facultyDocs.forEach(d => {
            if (d.exists) facultyMap[d.id] = d.data();
        });
    }

    if (USE_MOCK_AUTH) {
        MOCK_USERS.forEach(u => {
            if (!facultyMap[u.id]) facultyMap[u.id] = u;
        });
    }

    const courses = snapshot.docs.map(doc => {
        const data = doc.data();
        const faculty = facultyMap[data.facultyId];
        return {
            id: doc.id,
            ...data,
            facultyName: faculty?.name || data.facultyName || 'Not Assigned'
        };
    });

    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      isOpen: typeof req.body?.isOpen === 'boolean' ? req.body.isOpen : false
    };
    const docRef = await db.collection('courses').add(payload);
    const newCourse = { id: docRef.id, ...payload };

    res.status(201).json(newCourse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const courseRef = db.collection('courses').doc(id);
    await courseRef.update(payload);
    const updated = await courseRef.get();

    res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const courseRef = db.collection('courses').doc(id);
    const courseDoc = await courseRef.get();
    if (!courseDoc.exists) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const [enrollmentRef, sessionRef, feedbackRef] = await Promise.all([
      db.collection('enrollments').where('courseId', '==', id).limit(1).get(),
      db.collection('sessions').where('courseId', '==', id).limit(1).get(),
      db.collection('feedback').where('courseId', '==', id).limit(1).get()
    ]);

    if (!enrollmentRef.empty) {
      return res.status(409).json({ error: 'Cannot delete, course has enrollments.' });
    }
    if (!sessionRef.empty) {
      return res.status(409).json({ error: 'Cannot delete, course has sessions.' });
    }
    if (!feedbackRef.empty) {
      return res.status(409).json({ error: 'Cannot delete, course has feedback.' });
    }

    await courseRef.delete();

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};