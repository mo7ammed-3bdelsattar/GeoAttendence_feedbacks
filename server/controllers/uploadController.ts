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

    const PORT = process.env.PORT || 5000;
    const localIP = getLocalIP();
    
    // Construct local URL
    // We serve the 'server/uploads' folder as '/uploads' static route
    const imageUrl = `http://${localIP}:${PORT}/uploads/avatars/${req.file.filename}`;

    console.log(`[UPLOAD] File saved: ${req.file.filename}`);
    
    res.json({ url: imageUrl });
  } catch (error: any) {
    console.error('[UPLOAD] Server Error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
