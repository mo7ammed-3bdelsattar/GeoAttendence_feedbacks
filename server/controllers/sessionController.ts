import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { db, admin } from '../config/firebase-admin';
import { hasTimeOverlap, validateSessionPayload } from '../models/sessionModel';
import { getAuthenticatedUser } from '../middleware/authGuard';

type SessionDoc = {
  courseId: string;
  facultyId: string;
  classroomId: string;
  date: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  status?: 'UPCOMING' | 'ACTIVE' | 'ENDED';
  startedAt?: string;
  endedAt?: string;
  checkInDeadline?: string;
  qrSecret?: string;
  qrRotatedAt?: string;
};

async function isFacultyUser(userId: string): Promise<boolean> {
  if (!userId) return false;
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return false;
  const userData = userDoc.data() as { role?: string } | undefined;
  return userData?.role === 'faculty';
}

async function hasClassroomConflict(
  classroomId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<boolean> {
  const snapshot = await db
    .collection('sessions')
    .where('classroomId', '==', classroomId)
    .where('date', '==', date)
    .get();

  return snapshot.docs.some((doc) => {
    if (excludeId && doc.id === excludeId) return false;
    const data = doc.data() as Partial<SessionDoc>;
    if (!data.startTime || !data.endTime) return false;
    return hasTimeOverlap(startTime, endTime, data.startTime, data.endTime);
  });
}

async function enrichSessions(rawDocs: admin.firestore.QueryDocumentSnapshot[]) {
  try {
    if (rawDocs.length === 0) return [];
    
    const courseIds   = [...new Set(rawDocs.map(d => d.data().courseId).filter(id => !!id && typeof id === 'string'))];
    const facultyIds  = [...new Set(rawDocs.map(d => {
      const data = d.data();
      return data.facultyId || data.instructorId;
    }).filter(id => !!id && typeof id === 'string'))];
    const classroomIds= [...new Set(rawDocs.map(d => d.data().classroomId).filter(id => !!id && typeof id === 'string'))];

    const [courseDocs, facultyDocs, classroomDocs] = await Promise.all([
      courseIds.length   ? db.getAll(...courseIds.map(id   => db.collection('courses').doc(id)))    : Promise.resolve([]),
      facultyIds.length  ? db.getAll(...facultyIds.map(id  => db.collection('users').doc(id)))      : Promise.resolve([]),
      classroomIds.length? db.getAll(...classroomIds.map(id=> db.collection('classrooms').doc(id))) : Promise.resolve([]),
    ]);

    const courseMap    = Object.fromEntries(courseDocs.map(d    => [d.id, d.exists ? { id: d.id, ...(d.data() as any) } : null]));
    const facultyMap   = Object.fromEntries(facultyDocs.map(d   => [d.id, d.exists ? { id: d.id, ...(d.data() as any) } : null]));
    const classroomMap = Object.fromEntries(classroomDocs.map(d => [d.id, d.exists ? { id: d.id, ...(d.data() as any) } : null]));

    return rawDocs.map(doc => {
      const data = doc.data() as any;
      const fId = data.facultyId || data.instructorId;
      
      const todayStr = new Date().toISOString().split('T')[0];
      const sessionDate = data.date ? (typeof data.date === 'string' ? data.date.split('T')[0] : '') : '';
      
      const isDateToday = sessionDate === todayStr;
      const statusLower = String(data.status || '').toLowerCase();
      const isActiveInDb = data.isActive === true || statusLower === 'active';
      
      return {
        id: doc.id,
        ...data,
        isActive: isActiveInDb && isDateToday,
        course:    courseMap[data.courseId]    || null,
        faculty:   facultyMap[fId]  || null,
        classroom: classroomMap[data.classroomId] || null,
      };
    });
  } catch (err) {
    console.error('[ENRICH_SESSIONS_ERROR]', err);
    return rawDocs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  }
}

export const getSessions = async (req: Request, res: Response) => {
  try {
    const { courseId, facultyId } = req.query;
    console.log(`[API] getSessions - Query:`, { courseId, facultyId });
    
    let q: admin.firestore.Query = db.collection('sessions');

    if (courseId)  q = q.where('courseId',  '==', courseId);
    if (facultyId) q = q.where('facultyId', '==', facultyId);

    const snapshot = await q.get();
    const sessions = await enrichSessions(snapshot.docs);

    res.json(sessions);
  } catch (error: any) {
    console.error(`[API] getSessions Error:`, error);
    res.status(500).json({ error: error.message, message: 'Unable to fetch sessions.' });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const payload = req.body as Partial<SessionDoc>;
    const validation = validateSessionPayload(payload);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    const [courseDoc, classroomDoc, isFaculty] = await Promise.all([
      db.collection('courses').doc(String(payload.courseId)).get(),
      db.collection('classrooms').doc(String(payload.classroomId)).get(),
      isFacultyUser(String(payload.facultyId))
    ]);

    if (!courseDoc.exists) return res.status(400).json({ error: 'Invalid courseId.' });
    if (!classroomDoc.exists) return res.status(400).json({ error: 'Invalid classroomId.' });
    if (!isFaculty) return res.status(400).json({ error: 'facultyId must belong to a user with role faculty.' });

    const conflict = await hasClassroomConflict(
      String(payload.classroomId),
      String(payload.date),
      String(payload.startTime),
      String(payload.endTime)
    );
    if (conflict) return res.status(409).json({ error: 'Classroom has a conflicting session.' });

    const createdAt = new Date().toISOString();
    const docRef = await db.collection('sessions').add({
      ...payload,
      createdAt,
      status: 'UPCOMING'
    });

    res.status(201).json({ id: docRef.id, ...payload, createdAt, status: 'UPCOMING' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const startSessionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = getAuthenticatedUser(req);
    if (!currentUser?.uid) return res.status(401).json({ error: 'Unauthorized' });

    const sessionRef = db.collection('sessions').doc(id);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) return res.status(404).json({ error: 'Session not found.' });
    
    const session = sessionSnap.data() as SessionDoc;
    const startedAt = new Date().toISOString();
    const checkInDeadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const qrSecret = crypto.randomUUID();
    const qrRotatedAt = new Date().toISOString();

    await sessionRef.update({ 
        status: 'active', 
        startedAt, 
        endedAt: null,
        checkInDeadline,
        qrSecret,
        qrRotatedAt
    });

    return res.json({ id, status: 'active', startedAt });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const endSessionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessionRef = db.collection('sessions').doc(id);
    const endedAt = new Date().toISOString();
    await sessionRef.update({ status: 'ended', endedAt });
    await generateAttendanceSummary(id);
    return res.json({ id, status: 'ended', endedAt });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getSessionsByFaculty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userDoc = await db.collection('users').doc(id).get();
    const email = (userDoc.data() as any)?.email;
    const possibleIds = [id];
    if (email) { possibleIds.push(email); possibleIds.push(`mock-${email}`); }

    const snapshot = await db.collection('sessions').where('facultyId', 'in', possibleIds).get();
    const sessions = await enrichSessions(snapshot.docs);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSessionsByStudent = async (req: Request, res: Response) => {
  try {
    const { id: studentId } = req.params;
    const enrollments = await db.collection('enrollments').where('studentId', '==', studentId).get();
    const courseIds = Array.from(new Set(enrollments.docs.map((doc) => doc.data().courseId)));
    if (courseIds.length === 0) return res.json([]);

    let sessionDocs: admin.firestore.QueryDocumentSnapshot[] = [];
    for (let i = 0; i < courseIds.length; i += 30) {
      const snap = await db.collection('sessions').where('courseId', 'in', courseIds.slice(i, i + 30)).get();
      sessionDocs = sessionDocs.concat(snap.docs);
    }

    const sessions = await enrichSessions(sessionDocs);
    const attendanceSnap = await db.collection('attendance').where('studentId', '==', studentId).get();
    const attendedSessionIds = new Set(attendanceSnap.docs.map((doc) => doc.data().sessionId));

    const finalSessions = sessions.map(s => ({
      ...s,
      attended: attendedSessionIds.has(s.id)
    }));

    return res.json(finalSessions);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export async function generateAttendanceSummary(sessionId: string) {
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) throw new Error('Session not found.');

  const session = sessionSnap.data() as SessionDoc;
  const enrollmentSnap = await db.collection('enrollments').where('courseId', '==', session.courseId).get();
  const studentIds = enrollmentSnap.docs.map((doc) => doc.data().studentId as string);
  
  const attendanceRef = sessionRef.collection('attendanceRecords');
  const attendanceSnap = await attendanceRef.get();
  const attendanceByStudent = Object.fromEntries(attendanceSnap.docs.map((doc) => [doc.id, doc.data() as any]));

  const students = await Promise.all(studentIds.map(async (studentId) => {
      const userSnap = await db.collection('users').doc(studentId).get();
      const studentName = userSnap.exists ? String(userSnap.data()?.name || userSnap.data()?.email || 'Unknown') : 'Unknown';
      const record = attendanceByStudent[studentId];
      const checkInAt = record?.checkInAt ?? null;
      const checkOutAt = record?.checkOutAt ?? null;
      const status = checkInAt ? (checkOutAt ? 'PRESENT_FULL' : 'PRESENT_NO_CHECKOUT') : 'ABSENT';

      if (!record) {
        await attendanceRef.doc(studentId).set({ studentId, studentName, checkInAt: null, checkOutAt: null, status: 'ABSENT' });
      }
      return { studentId, studentName, checkInAt, checkOutAt, status };
    })
  );

  const summary = {
    totalEnrolled: students.length,
    totalPresent: students.filter(s => s.status !== 'ABSENT').length,
    totalAbsent: students.filter(s => s.status === 'ABSENT').length,
    students,
  };

  await sessionRef.collection('attendanceSummary').doc('summary').set(summary);
  return summary;
}

export const getSessionSummary = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const sessionRef = db.collection('sessions').doc(sessionId);
    const summarySnap = await sessionRef.collection('attendanceSummary').doc('summary').get();
    
    if (summarySnap.exists) return res.json(summarySnap.data());

    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) return res.status(404).json({ error: 'Session not found.' });

    const summary = await generateAttendanceSummary(sessionId);
    return res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const startSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, courseId, roomId } = req.body;
    const currentUser = (req as any).currentUser;
    const startedAt = new Date().toISOString();
    const checkInDeadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const qrSecret = crypto.randomUUID();
    const qrRotatedAt = new Date().toISOString();

    if (sessionId) {
      const sessionRef = db.collection('sessions').doc(sessionId);
      await sessionRef.update({ status: 'active', startedAt, checkInDeadline, qrSecret, qrRotatedAt });
      return res.json({ sessionId });
    }

    const docRef = await db.collection('sessions').add({
      courseId, classroomId: roomId, facultyId: currentUser.uid,
      status: 'active', startedAt, checkInDeadline, qrSecret, qrRotatedAt,
    });
    return res.json({ sessionId: docRef.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const endSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const sessionRef = db.collection('sessions').doc(sessionId);
    await sessionRef.update({ status: 'ended', endedAt: new Date().toISOString() });
    await generateAttendanceSummary(sessionId);
    return res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSessionQr = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionSnap = await sessionRef.get();
    const session = sessionSnap.data() as SessionDoc;
    const statusLower = String(session.status || '').toLowerCase();
    if (statusLower !== 'active') {
      return res.status(400).json({ error: 'session_not_active', message: 'Session must be active to generate a QR code.' });
    }

    let { qrSecret, qrRotatedAt } = session;
    const now = new Date();
    if (!qrSecret || !qrRotatedAt || now.getTime() - new Date(qrRotatedAt).getTime() >= 30 * 1000) {
      qrSecret = crypto.randomUUID();
      qrRotatedAt = new Date().toISOString();
      await sessionRef.update({ qrSecret, qrRotatedAt });
    }

    const qrToken = jwt.sign({ sessionId, secret: qrSecret, issuedAt: now.getTime(), expiresAt: now.getTime() + 30000 }, qrSecret, { expiresIn: '30s' });
    return res.json({ token: qrToken, expiresAt: new Date(now.getTime() + 30000).toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const checkInWithLocation = async (req: Request, res: Response) => {
  try {
    const { sessionId, gpsCoords } = req.body;
    const currentUser = (req as any).currentUser;
    const sessionRef = db.collection('sessions').doc(sessionId);
    const record = { studentId: currentUser.uid, checkInAt: new Date().toISOString(), gpsCoords, status: 'PRESENT' };
    await sessionRef.collection('attendanceRecords').doc(currentUser.uid).set(record, { merge: true });
    await db.collection('attendance').add({ sessionId, studentId: currentUser.uid, status: 'present', timestamp: record.checkInAt });
    return res.status(201).json(record);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const checkOutWithLocation = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const currentUser = (req as any).currentUser;
    await db.collection('sessions').doc(sessionId).collection('attendanceRecords').doc(currentUser.uid).set({ checkOutAt: new Date().toISOString() }, { merge: true });
    return res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const checkInWithQr = async (req: Request, res: Response) => {
  try {
    const { qrToken, gpsCoords } = req.body;
    const currentUser = (req as any).currentUser;
    const decoded = jwt.decode(qrToken) as any;
    const sessionRef = db.collection('sessions').doc(decoded.sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return res.status(404).json({ error: 'session_not_found', message: 'Session not found.' });
    }

    const session = sessionSnap.data() as SessionDoc;
    const statusLower = String(session.status || '').toLowerCase();
    if (statusLower !== 'active') {
      return res.status(403).json({ error: 'session_not_active', message: 'QR is only valid while the session is active.' });
    }
    if (!session.qrSecret) {
      return res.status(403).json({ error: 'invalid_qr', message: 'QR token is invalid.' });
    }

    try {
      jwt.verify(qrToken, session.qrSecret);
    } catch (error) {
      return res.status(403).json({ error: 'invalid_qr', message: 'QR token is invalid or has been rotated.' });
    }

    const now = Date.now();
    if (decoded.expiresAt <= now) {
      return res.status(403).json({ error: 'qr_expired', message: 'The QR code expired. Ask the instructor to refresh it.' });
    }

    if (!session.checkInDeadline || now > new Date(session.checkInDeadline).getTime()) {
      return res.status(403).json({ error: 'checkin_window_closed', message: 'Check-in window is closed. The session started more than 15 minutes ago.' });
    }

    const classroomDoc = await db.collection('classrooms').doc(session.classroomId).get();
    if (!classroomDoc.exists) {
      return res.status(400).json({ error: 'classroom_not_found', message: 'Classroom not found for session.' });
    }
    const classroom = classroomDoc.data() as { lat?: number; lng?: number; geofenceRadiusMeters?: number };
    if (classroom.lat === undefined || classroom.lng === undefined) {
      return res.status(400).json({ error: 'classroom_invalid', message: 'Classroom location is not configured.' });
    }

    const allowedRadius = Number(classroom.geofenceRadiusMeters ?? 50);
    const distance = haversineMeters(gpsCoords.lat, gpsCoords.lng, classroom.lat, classroom.lng);
    if (distance > allowedRadius) {
      return res.status(403).json({ error: 'geofence_violation', message: 'You are outside the classroom geofence.' });
    }

    const attendanceRef = sessionRef.collection('attendanceRecords').doc(currentUser.uid);
    const attendanceSnap = await attendanceRef.get();
    if (attendanceSnap.exists && attendanceSnap.data()?.checkInAt) {
      return res.status(409).json({ error: 'already_checked_in', message: 'You have already checked in.' });
    }

    const record = {
      studentId: currentUser.uid,
      checkInAt: new Date().toISOString(),
      gpsCoords,
      deviceId: req.headers['user-agent'] || 'unknown',
      status: 'PRESENT',
    };

    await attendanceRef.set(record, { merge: true });
    return res.status(201).json(record);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const checkOutWithQr = async (req: Request, res: Response) => {
  try {
    const { qrToken } = req.body;
    const currentUser = (req as any).currentUser;
    if (!currentUser?.uid) {
      return res.status(401).json({ error: 'unauthenticated', message: 'User not authenticated.' });
    }
    if (!qrToken || !gpsCoords?.lat || !gpsCoords?.lng) {
      return res.status(400).json({ error: 'qrToken and gpsCoords are required.' });
    }

    const decoded = validateQrToken(qrToken);
    const sessionRef = db.collection('sessions').doc(decoded.sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return res.status(404).json({ error: 'session_not_found', message: 'Session not found.' });
    }

    const session = sessionSnap.data() as SessionDoc;
    const statusLower = String(session.status || '').toLowerCase();
    if (statusLower !== 'active') {
      return res.status(403).json({ error: 'session_not_active', message: 'Session must be active for check-out.' });
    }
    if (!session.qrSecret) {
      return res.status(403).json({ error: 'invalid_qr', message: 'QR token is invalid.' });
    }

    try {
      jwt.verify(qrToken, session.qrSecret);

    const now = Date.now();
    if (decoded.expiresAt <= now) {
      return res.status(403).json({ error: 'qr_expired', message: 'The QR code expired. Ask the instructor to refresh it.' });
    }

    const classroomDoc = await db.collection('classrooms').doc(session.classroomId).get();
    if (!classroomDoc.exists) {
      return res.status(400).json({ error: 'classroom_not_found', message: 'Classroom not found for session.' });
    }
    const classroom = classroomDoc.data() as { lat?: number; lng?: number; geofenceRadiusMeters?: number };
    if (classroom.lat === undefined || classroom.lng === undefined) {
      return res.status(400).json({ error: 'classroom_invalid', message: 'Classroom location is not configured.' });
    }
    const allowedRadius = Number(classroom.geofenceRadiusMeters ?? 50);
    const distance = haversineMeters(gpsCoords.lat, gpsCoords.lng, classroom.lat, classroom.lng);
    if (distance > allowedRadius) {
      return res.status(403).json({ error: 'geofence_violation', message: 'You are outside the classroom geofence.' });
    }

    } catch (error) {
      return res.status(403).json({ error: 'invalid_qr', message: 'QR token is invalid or has been rotated.' });
    }

    const attendanceRef = sessionRef.collection('attendanceRecords').doc(currentUser.uid);
    const attendanceSnap = await attendanceRef.get();
    if (!attendanceSnap.exists || !attendanceSnap.data()?.checkInAt) {
      return res.status(403).json({ error: 'not_checked_in', message: 'You must check in before checking out.' });
    }

    await attendanceRef.set({ checkOutAt: new Date().toISOString() }, { merge: true });
    return res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('sessions').doc(id).update(req.body);
    res.json({ id, ...req.body });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    await db.collection('sessions').doc(req.params.id).delete();
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
