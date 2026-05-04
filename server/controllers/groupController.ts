import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

export const getGroups = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.query;
    let query: FirebaseFirestore.Query = db.collection('groups');
    if (courseId) {
      query = query.where('courseId', '==', String(courseId));
    }
    const snapshot = await query.get();
    const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: groups });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createGroup = async (req: Request, res: Response) => {
  try {
    const { courseId, instructorId, name } = req.body;
    if (!courseId || !instructorId || !name) {
      return res.status(400).json({ error: 'courseId, instructorId, and name are required' });
    }
    const docRef = await db.collection('groups').add({
      courseId,
      instructorId,
      name,
      createdAt: new Date().toISOString()
    });
    res.status(201).json({ success: true, data: { id: docRef.id, courseId, instructorId, name } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    await db.collection('groups').doc(id).update(payload);
    res.json({ success: true, message: 'Group updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('groups').doc(id).delete();
    res.json({ success: true, message: 'Group deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
