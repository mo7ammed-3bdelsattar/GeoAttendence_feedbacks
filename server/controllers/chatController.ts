import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

/**
 * Chat Controller
 * Handles student <-> admin chat threads
 */

export const getMyChats = async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.query;
    
    let query = db.collection('chats');
    if (role === 'student') {
      if (!userId) return res.status(400).json({ error: 'userId is required for students' });
      query = query.where('studentId', '==', userId) as any;
    }

    const snapshot = await query.orderBy('updatedAt', 'desc').get();
    const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: chats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    if (!chatId) return res.status(400).json({ error: 'chatId is required' });

    const snapshot = await db.collection('chats').doc(chatId).collection('messages')
      .orderBy('createdAt', 'asc').get();
    
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { studentId, senderId, text, isAdmin } = req.body;
    if (!studentId || !senderId || !text) {
      return res.status(400).json({ error: 'studentId, senderId, and text are required' });
    }

    const chatId = studentId; // One thread per student
    const chatRef = db.collection('chats').doc(chatId);
    
    const message = {
      senderId,
      text,
      isAdmin: !!isAdmin,
      createdAt: new Date().toISOString()
    };

    await db.runTransaction(async (t) => {
      t.set(chatRef, {
        studentId,
        lastMessage: text,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      const msgRef = chatRef.collection('messages').doc();
      t.set(msgRef, message);
    });

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
