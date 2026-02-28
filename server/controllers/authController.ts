import { Request, Response } from 'express';
import { db, auth as adminAuth } from '../config/firebase-admin';

export const login = async (req: Request, res: Response) => {
  try {
    const { idToken, role } = req.body;

    // Verify token from client
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    // Get user from Firestore
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
     // Password reset email is usually sent via client SDK as it needs link.
     // Backend can generate the link if needed using .generatePasswordResetLink()
     const link = await adminAuth.generatePasswordResetLink(email);
     
     // You would normally send this email via SMTP (Nodemailer, SendGrid, etc.)
     // For this project, we'll just log it or return it.
     console.log(`[AUTH] Password reset requested for ${email}. Link: ${link}`);
     
     res.json({ message: 'Password reset link generated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
