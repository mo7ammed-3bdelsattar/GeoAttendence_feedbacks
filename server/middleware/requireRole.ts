import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUser } from './authGuard';

const normalizeRole = (role?: string) => {
  if (!role) return undefined;
  const lower = String(role).toLowerCase();
  if (lower === 'instructor' || lower === 'doctor' || lower === 'faculty') return 'faculty';
  return lower;
};

export const requireRole = (requiredRole: string | string[]) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await getAuthenticatedUser(req);
    
    if (!user || !user.uid) {
      console.log('[ROLE GUARD] Authentication failed: No valid user found in token.');
      return res.status(401).json({
        error: 'unauthenticated',
        message: 'Valid authentication token is required.',
      });
    }

    const currentRole = normalizeRole(user.role);

    if (!currentRole) {
      return res.status(403).json({
        error: 'role_mismatch',
        message: 'User role is missing or unrecognized.',
        uid: user.uid,
        requiredRole,
      });
    }

    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const allowed = rolesArray.some(r => normalizeRole(r) === currentRole);

    if (!allowed) {
      console.log(`[ROLE GUARD] Access denied for ${user.uid}. Role: ${currentRole}, Required: ${requiredRole}`);
      return res.status(403).json({
        error: 'role_mismatch',
        message: 'Role does not have permission to access this resource.',
        currentRole,
        requiredRole,
      });
    }

    (req as any).currentUser = user;
    next();
  } catch (error: any) {
    console.error('[ROLE GUARD] Critical error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: error.message,
    });
  }
};
