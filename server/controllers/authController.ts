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

      return res.json({
        id: uid,
        name: userData?.name || finalEmail,
        email: finalEmail,
        role: normalizedUserRole
      });
    } else {
      // Mock authentication - backward compatibility
      const mockUsers = {
        'student@uni.edu': { password: 'password123', role: 'student', name: 'John Student' },
        'faculty@uni.edu': { password: 'password123', role: 'faculty', name: 'Dr. Jane Faculty' },
        'admin@uni.edu': { password: 'password123', role: 'admin', name: 'Admin User' },
        'ahmedaymanmido307@gmail.com': { password: 'password123', role: 'admin', name: 'Ahmed Ayman' },
      };

      const user = mockUsers[finalEmail as keyof typeof mockUsers];
      const normalizedUserRole = normalizeRole(user?.role);
      const normalizedSelectedRole = normalizeRole(role);
      if (!user || user.password !== password || normalizedUserRole !== normalizedSelectedRole) {
        console.log('Auth failed:', { user: !!user, passwordMatch: user?.password === password, roleMatch: normalizedUserRole === normalizedSelectedRole, expectedRole: role, userRole: user?.role });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      uid = `mock-${finalEmail}`;
      const geoToken = `geo-${Buffer.from(JSON.stringify({ sub: uid, role: user.role, email: finalEmail })).toString('base64')}.${Date.now()}`;

      await db.collection('users').doc(uid).set({
        name: user.name,
        email: finalEmail,
        role: user.role
      }, { merge: true });

      return res.json({
        id: uid,
        name: user.name,
        email: finalEmail,
        role: user.role,
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
