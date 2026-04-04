import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

export const getSessions = async (req: Request, res: Response) => {
  try {
    const { courseId, facultyId } = req.query;
    let q = db.collection('sessions');

    if (courseId) q = q.where('courseId', '==', courseId);
    if (facultyId) q = q.where('facultyId', '==', facultyId);

    const snapshot = await q.get();
    const sessions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const docRef = await db.collection('sessions').add({
      ...payload,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    const newSession = { id: docRef.id, ...payload, status: 'active' };

    res.status(201).json(newSession);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const sessionRef = db.collection('sessions').doc(id);
    await sessionRef.update(payload);
    const updated = await sessionRef.get();

    res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const closeSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('sessions').doc(id).update({
      status: 'ended',
      endedAt: new Date().toISOString()
    });

    res.json({ message: 'Session closed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('sessions').doc(id).delete();
    res.json({ message: 'Session deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAttendance = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const snapshot = await db.collection('attendance').where('sessionId', '==', sessionId).get();
    const attendance = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const checkIn = async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, lat, lng } = req.body;

    // Get session to check geofence
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const session = sessionDoc.data();

    // Calculate distance (simple approximation)
    const distance = Math.sqrt(Math.pow(lat - session.lat, 2) + Math.pow(lng - session.lng, 2)) * 111000; // meters
    const locationVerified = distance <= session.geofenceRadiusMeters;

    const checkInData = {
      sessionId,
      userId,
      checkedInAt: new Date().toISOString(),
      lat,
      lng,
      locationVerified
    };

    const docRef = await db.collection('attendance').add(checkInData);
    res.status(201).json({ id: docRef.id, ...checkInData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};