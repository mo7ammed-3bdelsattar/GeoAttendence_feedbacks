import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

// Mock users for testing - no Firestore needed
const MOCK_USERS = [
  {
    id: 'admin-1',
    name: 'أحمد أيمن',
    email: 'ahmedaymanmido307@gmail.com',
    role: 'admin',
    password: 'password123'
  },
  {
    id: 's-yassin',
    name: 'ياسين محمد السعدي',
    email: 'yassin.mohamed@student.uni.edu',
    role: 'student',
    password: 'password123'
  },
  {
    id: 'f-mohamed',
    name: 'د. محمد علي',
    email: 'm.ali@uni.edu',
    role: 'faculty',
    password: 'password123'
  }
];

const UNIVERSAL_PASSWORDS = new Set(['password123', 'password 123']);

const normalizeRoleFromEmail = (email: string): 'admin' | 'faculty' | 'student' => {
  const lower = email.toLowerCase();
  if (lower.includes('admin')) return 'admin';
  if (lower.includes('faculty') || lower.includes('instructor') || lower.includes('doctor')) return 'faculty';
  return 'student';
};

export const loginMock = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('Mock Login attempt:', { email });
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const isUniversalPassword = typeof password === 'string' && UNIVERSAL_PASSWORDS.has(password.trim());

    // 1) Prefer real DB user by email (so role is always accurate)
    const dbUserSnap = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
    if (!dbUserSnap.empty) {
      const dbUserDoc = dbUserSnap.docs[0];
      const dbUser = dbUserDoc.data() as { name?: string; email?: string; role?: string; password?: string };
      if (dbUser.password && dbUser.password !== password && !isUniversalPassword) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const normalizedRole =
        dbUser.role === 'instructor' || dbUser.role === 'doctor'
          ? 'faculty'
          : (dbUser.role || 'student');

      const geoToken = `geo-${Buffer.from(
        JSON.stringify({
          sub: dbUserDoc.id,
          role: normalizedRole,
          email: dbUser.email || normalizedEmail
        })
      ).toString('base64')}.${Date.now()}`;

      console.log(`[AUTH MOCK] DB-backed login success: ${normalizedEmail} (${normalizedRole})`);
      return res.json({
        id: dbUserDoc.id,
        name: dbUser.name || normalizedEmail.split('@')[0] || 'User',
        email: dbUser.email || normalizedEmail,
        role: normalizedRole,
        token: geoToken
      });
    }

    // 2) Fallback to hardcoded mock users
    const user = MOCK_USERS.find(
      u => u.email.toLowerCase() === normalizedEmail
    );

    if (!user) {
      if (!isUniversalPassword) {
        console.log(`[AUTH MOCK] Unknown email denied (invalid universal password): ${email}`);
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // Dev fallback: allow unknown emails with universal password.
      const role = normalizeRoleFromEmail(normalizedEmail);
      const id = `dev-${normalizedEmail.replace(/[^a-z0-9]/g, '-')}`;
      const name = normalizedEmail.split('@')[0] || 'User';
      const geoToken = `geo-${Buffer.from(
        JSON.stringify({
          sub: id,
          role,
          email: normalizedEmail
        })
      ).toString('base64')}.${Date.now()}`;

      console.log(`[AUTH MOCK] Dev login success for unknown email: ${normalizedEmail} (${role})`);
      return res.json({
        id,
        name,
        email: normalizedEmail,
        role,
        token: geoToken
      });
    }

    // Verify password
    if (user.password !== password && !isUniversalPassword) {
      console.log(`[AUTH MOCK] Invalid password for: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Generate mock token
    const geoToken = `geo-${Buffer.from(
      JSON.stringify({ 
        sub: user.id, 
        role: user.role, 
        email: user.email 
      })
    ).toString('base64')}.${Date.now()}`;

    console.log(`[AUTH MOCK] Login success for: ${email} (${user.role})`);

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: geoToken
    });
  } catch (error: any) {
    console.error('Mock Login error:', error);
    res.status(500).json({ error: error.message });
  }
};
