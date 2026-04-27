import { Request, Response } from 'express';
import admin, { db, auth as adminAuth } from '../config/firebase-admin';
import { sendUpcomingSessionNotifications } from '../utils/notificationCron';

const ALLOWED_ROLES = ['student', 'faculty', 'admin'] as const;

type UserRole = typeof ALLOWED_ROLES[number];

const normalizeRole = (role?: string): UserRole => {
  if (!role) return 'student';
  const normalized = role.toLowerCase();
  if (normalized === 'instructor' || normalized === 'faculty') return 'faculty';
  if (normalized === 'admin') return 'admin';
  return 'student';
};

const validateRole = (role?: string): UserRole => {
  const normalized = normalizeRole(role);
  if (!ALLOWED_ROLES.includes(normalized)) {
    throw new Error(`Invalid role: ${role}`);
  }
  return normalized;
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    console.log('[USER CONTROLLER] Fetching users from Firestore...', { role });
    
    const usersCol = db.collection('users');
    let q: admin.firestore.Query = usersCol;

    if (role) {
      q = usersCol.where('role', '==', String(role));
    }

    const snapshot = await q.get();
    console.log('[USER CONTROLLER] Firestore query successful:', { docsCount: snapshot.docs.length });
    
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(users);
  } catch (error: any) {
    console.error('[USER CONTROLLER] Firestore query failed:', {
      message: error.message,
      code: error.code,
      details: error.details || 'No additional details'
    });
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      details: 'Check server logs for more information'
    });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const { email, password, name, role } = payload;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, and name are required' });
    }

    const validatedRole = validateRole(role);

    const userAuth = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const newUser = {
      id: userAuth.uid,
      name,
      email,
      password,
      role: validatedRole,
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

    if (payload.role) {
      payload.role = validateRole(payload.role);
    }

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
    await adminAuth.deleteUser(userId);
    await db.collection('users').doc(userId).delete();

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePushToken = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({ error: 'pushToken is required' });
    }

    const userId = String(id);
    await db.collection('users').doc(userId).update({ pushToken });

    res.json({ success: true, pushToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAvatar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { avatar } = req.body;

    if (avatar === undefined) {
      return res.status(400).json({ error: 'avatar field is required' });
    }

    const userId = String(id);
    await db.collection('users').doc(userId).set({ avatar }, { merge: true });

    res.json({ success: true, avatar });
  } catch (error: any) {
    console.error(`[updateAvatar] Error updating avatar for user ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
};

export const testNotifications = async (req: Request, res: Response) => {
  try {
    const { minutes } = req.body;
    await sendUpcomingSessionNotifications(minutes || 15);
    res.json({ success: true, message: 'Notification sweep triggered' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


