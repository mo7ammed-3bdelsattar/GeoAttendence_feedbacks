import { Request, Response } from 'express';
import admin, { db, auth as adminAuth } from '../config/firebase-admin';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const usersCol = db.collection('users');
    let q: admin.firestore.Query = usersCol;

    if (role) {
      q = usersCol.where('role', '==', String(role));
    }

    const snapshot = await q.get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const { email, password, name, role } = payload;

    // Use admin.auth() to create a real user in Firebase Auth
    const userAuth = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const newUser = {
      id: userAuth.uid,
      name,
      email,
      role: role ?? 'student',
    };

    await db.collection('users').doc(userAuth.uid).set(newUser);
    res.status(201).json(newUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const userId = String(id);
    await db.collection('users').doc(userId).update(payload);
    const updated = await db.collection('users').doc(userId).get();
    
    res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const userId = String(id);
    // Remove from both Auth and Firestore
    await adminAuth.deleteUser(userId);
    await db.collection('users').doc(userId).delete();

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
