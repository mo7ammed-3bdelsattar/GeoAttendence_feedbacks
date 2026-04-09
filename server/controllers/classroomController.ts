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
    const classroomRef = db.collection('classrooms').doc(id);
    const classroomDoc = await classroomRef.get();
    if (!classroomDoc.exists) {
      return res.status(404).json({ error: 'Classroom not found.' });
    }

    const sessionsRef = await db.collection('sessions').where('classroomId', '==', id).limit(1).get();
    if (!sessionsRef.empty) {
      return res.status(409).json({ error: 'Cannot delete, classroom is used in sessions.' });
    }

    await classroomRef.delete();

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};