import { NextFunction, Request, Response } from 'express';
import { auth as adminAuth, db } from '../config/firebase-admin';

type AuthUser = {
  uid: string;
  email?: string;
  role?: string;
};

async function decodeToken(token: string): Promise<AuthUser | null> {
  if (!token) return null;

  if (token.startsWith('geo-')) {
    const payloadToken = token.slice(4).split('.')[0];
    if (!payloadToken) return null;
    try {
      const decoded = JSON.parse(Buffer.from(payloadToken, 'base64').toString('utf8')) as {
        sub?: string;
        email?: string;
        role?: string;
      };
      if (!decoded?.sub) return null;
      return { uid: decoded.sub, role: decoded.role, email: decoded.email };
    } catch {
      return null;
    }
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    let user: AuthUser = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role as string,
    };

    if (!user.role) {
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        if (userDoc.exists) {
            user.role = userDoc.data()?.role;
        }
    }
    return user;
  } catch (error) {
    console.error('[AUTH GUARD] Token verification failed:', error);
    return null;
  }
}

export async function getAuthenticatedUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return decodeToken(token);
}

export async function requireStudentAuth(req: Request, res: Response, next: NextFunction) {
  const user = await getAuthenticatedUser(req);
  if (!user?.uid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }

  if (user.role && user.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden: Student access only.' });
  }

  (req as any).currentUser = user;
  return next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await getAuthenticatedUser(req);
  if (!user?.uid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }

  (req as any).currentUser = user;
  return next();
}
