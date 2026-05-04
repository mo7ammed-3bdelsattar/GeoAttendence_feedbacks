import { NextFunction, Request, Response } from 'express';

type AuthUser = {
  uid: string;
  role?: string;
};

function decodeLegacyAccessToken(token: string): AuthUser | null {
  if (!token.startsWith('geo-')) return null;
  const payloadToken = token.slice(4).split('.')[0];
  if (!payloadToken) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payloadToken, 'base64').toString('utf8')) as {
      sub?: string;
      role?: string;
    };
    if (!decoded?.sub) return null;
    return { uid: decoded.sub, role: decoded.role };
  } catch {
    return null;
  }
}

export function getAuthenticatedUser(req: Request): AuthUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return decodeLegacyAccessToken(token);
}

export function requireStudentAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user?.uid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }

  if (user.role && user.role !== 'student') {
    return res.status(403).json({ error: 'Forbidden: Student access only.' });
  }

  (req as any).currentUser = user;
  return next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user?.uid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
  }

  (req as any).currentUser = user;
  return next();
}
