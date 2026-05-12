import { Request, Response } from 'express';
import { getAuthenticatedUser } from '../middleware/authGuard';
import os from 'os';

const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

export const uploadImage = async (req: Request, res: Response) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.uid) {
      console.warn('[UPLOAD] Unauthorized attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      console.warn('[UPLOAD] No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[UPLOAD] Processing file for user ${authUser.uid}:`, req.file.originalname);

    // Robust URL generation for production (Railway/Render/etc.)
    // 1. Check for X-Forwarded headers (set by proxies/load balancers)
    // 2. Fallback to req.protocol/host (standard Express)
    // 3. Optional: Use a PUBLIC_URL environment variable if set
    
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    
    let baseUrl = `${protocol}://${host}`;
    
    // If we have a PUBLIC_URL set in environment, prioritize it
    if (process.env.PUBLIC_URL) {
      baseUrl = process.env.PUBLIC_URL.replace(/\/$/, '');
    }

    const imageUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;

    console.log(`[UPLOAD] File saved: ${req.file.filename}`);
    console.log(`[UPLOAD] Generated URL: ${imageUrl}`);
    
    res.json({ url: imageUrl });
  } catch (error: any) {
    console.error('[UPLOAD] Server Error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
