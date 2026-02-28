import { Request, Response } from 'express';
import { db, auth as adminAuth } from '../config/firebase-admin';

export const login = async (req: Request, res: Response) => {
  try {
    const { idToken, role } = req.body;
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email } = decodedToken;
    const userDoc = await db.collection('users').doc(uid).get();
    
    const userData = userDoc.data();
    if (!userDoc.exists || !userData) {
       return res.status(404).json({ error: 'User profile not found' });
    }
    if (userData?.role !== role) {
       return res.status(403).json({ error: `Unauthorized: Expected ${role} role` });
    }

    res.json({
      id: uid,
      name: userData.name || email?.split('@')[0],
      email: email,
      role: userData.role
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
     const { email } = req.body;
     const link = await adminAuth.generatePasswordResetLink(email);
     console.log(`[AUTH] Password reset requested for ${email}. Link: ${link}`);
     res.json({ message: 'Password reset link generated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
