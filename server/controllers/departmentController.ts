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

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const docRef = await db.collection('departments').add(payload);
    const newDepartment = { id: docRef.id, ...payload };

    res.status(201).json(newDepartment);
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

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deptRef = db.collection('departments').doc(id);
    const deptDoc = await deptRef.get();

    if (!deptDoc.exists) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    const coursesSnapshot = await db.collection('courses').where('departmentId', '==', id).limit(1).get();
    if (!coursesSnapshot.empty) {
      return res.status(409).json({ error: 'Cannot delete, department has courses.' });
    }

    await deptRef.delete();
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
