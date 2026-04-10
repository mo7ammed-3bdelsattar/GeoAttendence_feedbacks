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

    const deptRef = db.collection('departments').doc(id as string);
    await deptRef.update(payload);
    const updated = await deptRef.get();

    res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const deptRef = await db.collection('departments').add(payload);
    const newDept = await deptRef.get();

    res.status(201).json({ id: newDept.id, ...newDept.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('departments').doc(id as string).delete();
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
