import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { db, auth as adminAuth } from '../config/firebase-admin';

const normalizeRole = (role?: string) => {
  if (!role) return undefined;
  if (role === 'instructor') return 'faculty';
  return role;
};

export const requireRole = (requiredRole: string) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthenticated',
        message: 'Authorization header is required.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    let currentRole = normalizeRole(String(decoded.role));

    if (!currentRole) {
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      currentRole = normalizeRole(userDoc.data()?.role as string);
    }

    if (!currentRole) {
      return res.status(403).json({
        error: 'role_mismatch',
        message: 'User role is missing in token or profile.',
        currentRole: 'unknown',
        requiredRole,
      });
    }

    if (currentRole !== requiredRole) {
      return res.status(403).json({
        error: 'role_mismatch',
        message: 'Role does not have permission to access this resource.',
        currentRole,
        requiredRole,
      });
    }

    (req as any).currentUser = decoded;
    next();
  } catch (error: any) {
    console.error('[ROLE GUARD]', error);
    return res.status(401).json({
      error: 'unauthenticated',
      message: 'Invalid or expired token.',
    });
  }
};
