import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';
import { getAuthenticatedUser } from '../middleware/authGuard';

export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const currentUser = getAuthenticatedUser(req);
    if (!currentUser?.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const snapshot = await db.collection('notifications')
      .where('studentId', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const rows = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
