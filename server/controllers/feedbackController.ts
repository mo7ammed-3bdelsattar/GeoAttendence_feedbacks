import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, rating, comment } = req.body;

    const feedbackData = {
      sessionId,
      userId,
      rating,
      comment,
      submittedAt: new Date().toISOString()
    };

    const docRef = await db.collection('feedback').add(feedbackData);
    res.status(201).json({ id: docRef.id, ...feedbackData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getFeedback = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const snapshot = await db.collection('feedback').where('sessionId', '==', sessionId).get();
    const feedback = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(feedback);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};