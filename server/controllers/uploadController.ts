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

    // Dynamic URL generation based on the request
    const protocol = req.protocol;
    const host = req.get('host');
    
    // Construct URL that matches the current access method (supports HTTPS automatically)
    const imageUrl = `${protocol}://${host}/uploads/avatars/${req.file.filename}`;

    console.log(`[UPLOAD] File saved: ${req.file.filename}`);
    console.log(`[UPLOAD] Public URL: ${imageUrl}`);
    
    res.json({ url: imageUrl });
  } catch (error: any) {
    console.error('[UPLOAD] Server Error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
