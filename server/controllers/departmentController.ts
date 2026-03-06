import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('departments').get();
    const departments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(departments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const deptRef = db.collection('departments').doc(id);
    await deptRef.update(payload);
    const updated = await deptRef.get();

    res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
