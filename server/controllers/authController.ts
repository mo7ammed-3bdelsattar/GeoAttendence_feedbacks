import { Request, Response } from 'express';
import { db, auth as adminAuth } from '../config/firebase-admin';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    console.log('Login attempt:', { email, password, role });

    // Mock authentication - in real app, use proper auth
    const mockUsers = {
      'student@uni.edu': { password: 'password123', role: 'student', name: 'John Student' },
      'faculty@uni.edu': { password: 'password123', role: 'faculty', name: 'Dr. Jane Faculty' },
      'admin@uni.edu': { password: 'password123', role: 'admin', name: 'Admin User' },
      'ahmedaymanmido307@gmail.com': { password: 'password123', role: 'faculty', name: 'Ahmed Ayman' },
    };

    const normalizedEmail = email.toLowerCase().trim();
    console.log('Normalized email:', normalizedEmail);
    const user = mockUsers[normalizedEmail as keyof typeof mockUsers];
    console.log('Found user:', user);
    if (!user || user.password !== password || user.role !== role) {
      console.log('Invalid credentials');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create or update user in DB
    const uid = `mock-${normalizedEmail}`;
    await db.collection('users').doc(uid).set({
      name: user.name,
      email: normalizedEmail,
      role: user.role
    });

    res.json({
      id: uid,
      name: user.name,
      email: normalizedEmail,
      role: user.role
    });
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
