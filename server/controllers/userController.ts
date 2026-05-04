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

    // 1. Create user in Firebase Auth
    const userAuth = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Create user profile in Firestore
    const newUser = {
      ...payload,
      id: userAuth.uid,
      name,
      email,
      password, // Storing plaintext for fallback login as requested, but Firebase Auth handles it securely
      role: validatedRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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

    if (payload.role) {
      payload.role = validateRole(payload.role);
    }

    // Update Firebase Auth if email, password, or name is changed
    const authUpdates: any = {};
    if (payload.email) authUpdates.email = payload.email;
    if (payload.password) authUpdates.password = payload.password;
    if (payload.name) authUpdates.displayName = payload.name;

    if (Object.keys(authUpdates).length > 0) {
      await adminAuth.updateUser(userId, authUpdates);
    }

    payload.updatedAt = new Date().toISOString();
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

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log(`[USER CONTROLLER] Attempting to delete user: ${userId}`);

    // Delete from Firebase Auth first
    try {
      await adminAuth.deleteUser(userId);
      console.log(`[USER CONTROLLER] Firebase Auth user deleted: ${userId}`);
    } catch (authError: any) {
      // If user not found in Auth, still try to delete from Firestore
      if (authError.code !== 'auth/user-not-found') {
        throw authError;
      }
      console.warn(`[USER CONTROLLER] User not found in Firebase Auth: ${userId}`);
    }

    // Delete from Firestore
    await db.collection('users').doc(userId).delete();
    console.log(`[USER CONTROLLER] Firestore user document deleted: ${userId}`);

    // Optional: Clean up enrollments, attendance, etc.
    const enrollmentBatch = db.batch();
    const enrollments = await db.collection('enrollments').where('studentId', '==', userId).get();
    enrollments.forEach(doc => enrollmentBatch.delete(doc.ref));
    await enrollmentBatch.commit();

    res.status(204).send();
  } catch (error: any) {
    console.error(`[USER CONTROLLER] Delete user failed: ${error.message}`);
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

export const testNotifications = async (req: Request, res: Response) => {
  try {
    const { minutes } = req.body;
    await sendUpcomingSessionNotifications(minutes || 15);
    res.json({ success: true, message: 'Notification sweep triggered' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


