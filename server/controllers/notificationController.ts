import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';
import { getAuthenticatedUser } from '../middleware/authGuard';

export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser?.uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Try primary userId field
    const snapshot = await db.collection('notifications')
      .where('userId', '==', currentUser.uid)
      .limit(50)
      .get();

    let rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Fallback for older notifications using studentId
    if (rows.length === 0) {
       const studentSnap = await db.collection('notifications')
         .where('studentId', '==', currentUser.uid)
         .limit(50)
         .get();
       
       rows = studentSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    // Sort in memory to avoid mandatory Firestore composite index for now
    rows.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
    });

    return res.json(rows);
  } catch (error: any) {
    console.error('[NOTIFICATIONS ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
};
