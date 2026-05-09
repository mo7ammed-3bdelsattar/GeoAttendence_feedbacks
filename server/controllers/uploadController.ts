import { Request, Response } from 'express';
import { storage } from '../config/firebase-admin';
import { getAuthenticatedUser } from '../middleware/authGuard';
import { v4 as uuidv4 } from 'uuid';

export const uploadImage = async (req: Request, res: Response) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser?.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const bucket = storage.bucket();
    
    console.log(`[UPLOAD] Checking bucket: ${bucket.name}`);
    
    // Check if bucket exists first
    const [exists] = await bucket.exists();
    if (!exists) {
      console.error(`[UPLOAD] CRITICAL: Bucket '${bucket.name}' does not exist!`);
      return res.status(404).json({ 
        error: `Storage bucket '${bucket.name}' not found.`,
        details: 'Ensure you have clicked \"Get Started\" in the Storage tab of your Firebase Console.' 
      });
    }
    
    const extension = file.originalname.split('.').pop();
    const fileName = `avatars/${authUser.uid}-${uuidv4()}.${extension}`;
    const blob = bucket.file(fileName);

    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
      resumable: false,
    });

    blobStream.on('error', (err: any) => {
      console.error('[UPLOAD] Blob stream error:', err);
      if (err.code === 404) {
        res.status(404).json({ 
          error: 'Storage bucket not found. Please check your FIREBASE_STORAGE_BUCKET configuration.',
          details: err.message
        });
      } else {
        res.status(500).json({ error: 'Failed to upload to storage', details: err.message });
      }
    });

    blobStream.on('finish', async () => {
      // Make the file public or get a signed URL
      // For simplicity in this project, we'll use a public URL if the bucket allows it, 
      // or a long-lived signed URL.
      try {
        await blob.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        res.json({ url: publicUrl });
      } catch (publicError) {
        // If makePublic fails (e.g. lack of permissions), use signed URL
        const [signedUrl] = await blob.getSignedUrl({
          action: 'read',
          expires: '03-01-2500', // Very long lived
        });
        res.json({ url: signedUrl });
      }
    });

    blobStream.end(file.buffer);
  } catch (error: any) {
    console.error('[UPLOAD] Error:', error);
    res.status(500).json({ error: error.message });
  }
};
