import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { db, auth as adminAuth } from '../config/firebase-admin';

const normalizeRole = (role?: string) => {
  if (!role) return undefined;
  if (role === 'instructor' || role === 'doctor') return 'faculty';
  return role;
};

export const requireRole = (requiredRole: string | string[]) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // ... (existing token validation)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[ROLE GUARD] Missing or invalid Authorization header');
      return res.status(401).json({
        error: 'unauthenticated',
        message: 'Authorization header is required.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;

    if (token.startsWith('geo-')) {
      const payloadBase64 = token.split('-')[1].split('.')[0];
      try {
        const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
        decoded = {
          uid: decodedPayload.sub,
          role: decodedPayload.role,
          email: decodedPayload.email,
        };
      } catch (err) {
        throw new Error('Invalid mock token format');
      }
    } else {
      decoded = await adminAuth.verifyIdToken(token);
    }

    let currentRole = decoded.role && decoded.role !== 'undefined'
      ? normalizeRole(String(decoded.role))
      : undefined;

    if (!currentRole) {
      console.log(`[ROLE GUARD] No role found in token for user ${decoded.uid}, checking Firestore...`);
      let userDoc = await db.collection('users').doc(decoded.uid).get();
      
      // Fallback: Check by email if UID lookup fails (useful for seeded/mock accounts)
      if (!userDoc.exists() && decoded.email) {
        console.log(`[ROLE GUARD] UID lookup failed for ${decoded.uid}, trying email lookup: ${decoded.email}`);
        const userQuery = await db.collection('users').where('email', '==', decoded.email).limit(1).get();
        if (!userQuery.empty) {
          userDoc = userQuery.docs[0] as any;
        }
      }

      currentRole = normalizeRole(userDoc.data()?.role as string);
      console.log(`[ROLE GUARD] Firestore role for ${decoded.uid} (email: ${decoded.email}): ${currentRole}`);
    }

    if (!currentRole) {
      return res.status(403).json({
        error: 'role_mismatch',
        message: 'User role is missing.',
        currentRole: 'unknown',
        requiredRole,
      });
    }

    const allowed = Array.isArray(requiredRole) 
      ? requiredRole.includes(currentRole) 
      : currentRole === requiredRole;

    console.log(`[ROLE GUARD] User: ${decoded.uid}, Role: ${currentRole}, Required: ${requiredRole}, Allowed: ${allowed}`);

    if (!allowed) {
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
