import { Request, Response } from 'express';
import admin, { db, auth as adminAuth } from '../config/firebase-admin';
import { sendUpcomingSessionNotifications } from '../utils/notificationCron';
import { getAuthenticatedUser } from '../middleware/authGuard';

export const USE_MOCK_AUTH = process.env.USE_MOCK_AUTH === 'true';

// Mock users for testing when USE_MOCK_AUTH is true
export const MOCK_USERS = [
  {
    id: 'admin-1',
    name: 'أحمد أيمن',
    email: 'ahmedaymanmido307@gmail.com',
    role: 'admin'
  },
  {
    id: 's-yassin',
    name: 'ياسين محمد السعدي',
    email: 'yassin.mohamed@student.uni.edu',
    role: 'student'
  },
  {
    id: 'f-mohamed',
    name: 'د. محمد علي',
    email: 'm.ali@uni.edu',
    role: 'faculty'
  },
  {
    id: 'dev-ali-admin-uni-edu',
    name: 'Dev Ali Admin',
    email: 'dev-ali-admin@uni.edu',
    role: 'admin'
  }
];

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

    if (USE_MOCK_AUTH) {
      console.log('[USER CONTROLLER] Using mock users...', { role });
      let users = MOCK_USERS;

      if (role) {
        users = MOCK_USERS.filter(user => user.role === String(role));
      }

      console.log('[USER CONTROLLER] Mock query successful:', { usersCount: users.length });
      return res.json(users);
    }

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

export const updateMe = async (req: Request, res: Response) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    const userId = authUser?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = req.body;
    const allowedUpdates: any = {};
    if (payload.name) allowedUpdates.name = payload.name;
    if (payload.photoURL) allowedUpdates.photoURL = payload.photoURL;
    if (payload.password) allowedUpdates.password = payload.password;

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    // 1. Update Firebase Auth only for real users (non-mock IDs)
    const isMockId = userId.startsWith('admin-') || userId.startsWith('s-') || userId.startsWith('f-') || userId.startsWith('dev-');
    
    if (!isMockId) {
      try {
        const authUpdates: any = {};
        if (allowedUpdates.name) authUpdates.displayName = allowedUpdates.name;
        if (allowedUpdates.password) authUpdates.password = allowedUpdates.password;
        if (allowedUpdates.photoURL) authUpdates.photoURL = allowedUpdates.photoURL;

        if (Object.keys(authUpdates).length > 0) {
          await adminAuth.updateUser(userId, authUpdates);
        }
      } catch (authErr: any) {
        console.warn(`[USER CONTROLLER] Firebase Auth update failed for ${userId}:`, authErr.message);
        // Continue even if auth update fails (might be a mock user not correctly identified)
      }
    }

    // 2. Update Firestore (use set with merge to handle missing docs)
    allowedUpdates.updatedAt = new Date().toISOString();
    await db.collection('users').doc(userId).set(allowedUpdates, { merge: true });
    
    const updated = await db.collection('users').doc(userId).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    console.error('[USER CONTROLLER] Update me failed:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    const userId = authUser?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: No user identity found.' });
    }

    // 1. Try Firestore first (for real and seeded users)
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      return res.json({
        id: userDoc.id,
        ...userDoc.data()
      });
    }

    // 2. Fallback to Mock Users if Firestore lookup fails and USE_MOCK_AUTH is enabled
    if (USE_MOCK_AUTH) {
      const mockUser = MOCK_USERS.find(u => u.id === userId);
      if (mockUser) {
        return res.json(mockUser);
      }
    }

    return res.status(404).json({ error: 'User profile not found in database.' });
  } catch (error: any) {
    console.error('[USER CONTROLLER] Get current user failed:', error);
    res.status(500).json({ error: error.message });
  }
};


