import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

export const getClassrooms = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('classrooms').get();
    const classrooms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(classrooms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createClassroom = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const docRef = await db.collection('classrooms').add(payload);
    const newClassroom = { id: docRef.id, ...payload };

    res.status(201).json(newClassroom);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateClassroom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const classroomRef = db.collection('classrooms').doc(id);
    await classroomRef.update(payload);
    const updated = await classroomRef.get();

    res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteClassroom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('classrooms').doc(id).delete();

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};