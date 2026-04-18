import { Request, Response } from 'express';
import { db, auth as adminAuth } from '../config/firebase-admin';

const normalizeRole = (role?: string) => {
  if (!role) return undefined;
  const lower = role.toLowerCase();
  if (lower === 'instructor' || lower === 'faculty') return 'faculty';
  if (lower === 'admin') return 'admin';
  return 'student';
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, role, token } = req.body;
    console.log('Login attempt:', { email, role, hasToken: !!token });

    let uid = '';
    let finalEmail = email?.toLowerCase().trim();

    if (token) {
      // Authenticate via Firebase token
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
      finalEmail = decoded.email || finalEmail;
      console.log('Token verified for:', finalEmail);
      
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        return res.status(401).json({ error: 'User profile not found in DB.' });
      }

      const userData = userDoc.data();
      const normalizedUserRole = normalizeRole(String(userData?.role));
      const normalizedSelectedRole = normalizeRole(role);
      if (normalizedUserRole !== normalizedSelectedRole) {
        return res.status(403).json({ error: 'Role mismatch.' });
      }

      const geoToken = `geo-${Buffer.from(JSON.stringify({ sub: uid, role: normalizedUserRole, email: finalEmail })).toString('base64')}.${Date.now()}`;

      return res.json({
        id: uid,
        name: userData?.name || finalEmail,
        email: finalEmail,
        role: normalizedUserRole,
        token: geoToken
      });
    } else {
      // 1. Fetch user from Firestore by email
      console.log(`[AUTH] DB Login attempt for: ${finalEmail}`);
      const userSnap = await db.collection('users').where('email', '==', finalEmail).limit(1).get();
      
      if (userSnap.empty) {
        console.warn(`[AUTH] User not found: ${finalEmail}`);
        return res.status(401).json({ error: 'Invalid credentials. User not found.' });
      }

      const userDoc = userSnap.docs[0];
      const userData = userDoc.data();
      uid = userDoc.id;

      // 2. Verify password from DB
      if (!userData.password || userData.password !== password) {
        console.warn(`[AUTH] Password mismatch for: ${finalEmail}`);
        return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
      }

      // 3. Verify Role
      const normalizedUserRole = normalizeRole(userData.role);
      const normalizedSelectedRole = normalizeRole(role);

      if (normalizedUserRole !== normalizedSelectedRole) {
        return res.status(403).json({ error: `Role mismatch. This account is registered as ${normalizedUserRole}.` });
      }

      console.log(`[AUTH] Login success for: ${finalEmail} (${normalizedUserRole})`);

      const geoToken = `geo-${Buffer.from(JSON.stringify({ 
        sub: uid, 
        role: normalizedUserRole, 
        email: finalEmail 
      })).toString('base64')}.${Date.now()}`;

      return res.json({
        id: uid,
        name: userData.name || finalEmail,
        email: finalEmail,
        role: normalizedUserRole,
        token: geoToken
      });
    }
  } catch (error: any) {
    console.error('Login error:', error);
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
