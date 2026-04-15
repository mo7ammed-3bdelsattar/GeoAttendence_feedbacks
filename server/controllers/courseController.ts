import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

export const getCourses = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('courses').get();
    const courses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
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
    await db.collection('courses').doc(id).delete();

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};