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
    const facultyIds  = [...new Set(rawDocs.map(d => d.data().facultyId).filter(id => !!id && typeof id === 'string'))];
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
        faculty:   facultyMap[data.facultyId]  || null,
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
    console.log(`[API] getSessions - Found ${snapshot.size} sessions.`);
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

    if (!courseDoc.exists) {
      return res.status(400).json({ error: 'Invalid courseId.' });
    }
    if (!classroomDoc.exists) {
      return res.status(400).json({ error: 'Invalid classroomId.' });
    }
    if (!isFaculty) {
      return res.status(400).json({ error: 'facultyId must belong to a user with role faculty.' });
    }

    const conflict = await hasClassroomConflict(
      String(payload.classroomId),
      String(payload.date),
      String(payload.startTime),
      String(payload.endTime)
    );
    if (conflict) {
      return res.status(409).json({ error: 'Classroom has a conflicting session in the selected time range.' });
    }

    const createdAt = new Date().toISOString();
    const docRef = await db.collection('sessions').add({
      ...payload,
      createdAt,
      status: 'UPCOMING'
    });
    const newSession = { id: docRef.id, ...payload, createdAt, status: 'UPCOMING' as const };

    res.status(201).json(newSession);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

async function notifyStudentsSessionStarted(sessionId: string, session: SessionDoc) {
  const [courseSnap, enrollmentsSnap] = await Promise.all([
    db.collection('courses').doc(session.courseId).get(),
    db.collection('enrollments').where('courseId', '==', session.courseId).get()
  ]);
  const courseName = String(courseSnap.data()?.name || 'your course');
  const title = 'Session Started';
  const message = `Your instructor has started the session for ${courseName}`;
  const createdAt = new Date().toISOString();

  const writes = enrollmentsSnap.docs.map((doc) => {
    const studentId = String(doc.data().studentId || '');
    if (!studentId) return null;
    return db.collection('notifications').add({
      studentId,
      courseId: session.courseId,
      sessionId,
      type: 'session_started',
      title,
      message,
      read: false,
      createdAt
    });
  }).filter(Boolean);

  if (writes.length > 0) {
    await Promise.all(writes as Promise<any>[]);
  }
}

export const startSessionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Session ID is required.' });

    const currentUser = getAuthenticatedUser(req);
    if (!currentUser?.uid) return res.status(401).json({ error: 'Unauthorized' });
    if (currentUser.role && currentUser.role !== 'faculty') {
      return res.status(403).json({ error: 'Forbidden: Faculty access only.' });
    }

    const sessionRef = db.collection('sessions').doc(id);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) return res.status(404).json({ error: 'Session not found.' });
    const session = sessionSnap.data() as SessionDoc;

    const isOwner = session.facultyId === currentUser.uid || 
                    (currentUser.email && session.facultyId === currentUser.email) ||
                    (currentUser.email && session.facultyId === `mock-${currentUser.email}`);

    if (!isOwner) {
      return res.status(403).json({ error: 'Only assigned instructor can start this session.' });
    }
    if (session.status === 'ACTIVE') {
      return res.status(409).json({ error: 'Session is already active.' });
    }
    if (session.status === 'ENDED') {
      return res.status(409).json({ error: 'Cannot start an ended session.' });
    }

    const startedAt = new Date().toISOString();
    await sessionRef.update({ status: 'ACTIVE', startedAt, endedAt: null });
    await notifyStudentsSessionStarted(id, session);

    return res.json({ id, status: 'ACTIVE', startedAt });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const endSessionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Session ID is required.' });

    const currentUser = getAuthenticatedUser(req);
    console.log('[DEBUG] endSessionById - Current User:', currentUser);
    
    if (!currentUser?.uid) return res.status(401).json({ error: 'Unauthorized' });
    if (currentUser.role && currentUser.role !== 'faculty') {
      console.warn('[DEBUG] Role mismatch:', { userRole: currentUser.role, expected: 'faculty' });
      return res.status(403).json({ error: 'Forbidden: Faculty access only.' });
    }

    const sessionRef = db.collection('sessions').doc(id);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) return res.status(404).json({ error: 'Session not found.' });
    const session = sessionSnap.data() as SessionDoc;

    const isOwner = session.facultyId === currentUser.uid || 
                    (currentUser.email && session.facultyId === currentUser.email) ||
                    (currentUser.email && session.facultyId === `mock-${currentUser.email}`);

    if (!isOwner) {
      console.warn('[AUTH] Ownership mismatch:', { sessionFacultyId: session.facultyId, currentUserUid: currentUser.uid, currentUserEmail: currentUser.email });
      return res.status(403).json({ error: 'Only assigned instructor can end this session.' });
    }
    if (session.status !== 'ACTIVE') {
      return res.status(409).json({ error: 'Cannot end a session that is not active.' });
    }

    const endedAt = new Date().toISOString();
    await sessionRef.update({ status: 'ENDED', endedAt });
    return res.json({ id, status: 'ENDED', endedAt });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body as Partial<SessionDoc>;
    const validation = validateSessionPayload(payload);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    const sessionRef = db.collection('sessions').doc(id);
    const existing = await sessionRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const [courseDoc, classroomDoc, isFaculty] = await Promise.all([
      db.collection('courses').doc(String(payload.courseId)).get(),
      db.collection('classrooms').doc(String(payload.classroomId)).get(),
      isFacultyUser(String(payload.facultyId))
    ]);
    if (!courseDoc.exists) {
      return res.status(400).json({ error: 'Invalid courseId.' });
    }
    if (!classroomDoc.exists) {
      return res.status(400).json({ error: 'Invalid classroomId.' });
    }
    if (!isFaculty) {
      return res.status(400).json({ error: 'facultyId must belong to a user with role faculty.' });
    }

    const conflict = await hasClassroomConflict(
      String(payload.classroomId),
      String(payload.date),
      String(payload.startTime),
      String(payload.endTime),
      id
    );
    if (conflict) {
      return res.status(409).json({ error: 'Classroom has a conflicting session in the selected time range.' });
    }

    await sessionRef.update(payload);
    const updated = await sessionRef.get();

    res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSessionsByFaculty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'faculty id is required.' });

    console.log(`[API] getSessionsByFaculty - Checking for user: ${id}`);
    
    // 1. Get user profile to find their email
    const userDoc = await db.collection('users').doc(id).get();
    const userData = userDoc.exists ? (userDoc.data() as any) : null;
    const email = userData?.email;

    // 2. Build multi-format IDs to search for (Legacy support)
    const possibleIds = [id];
    if (email) {
      possibleIds.push(email);
      possibleIds.push(`mock-${email}`);
    }

    console.log(`[API] getSessionsByFaculty - Searching formats:`, possibleIds);

    // 3. Query sessions matching any of these IDs
    const snapshot = await db.collection('sessions')
      .where('facultyId', 'in', possibleIds)
      .get();
      
    console.log(`[API] getSessionsByFaculty - Found ${snapshot.size} sessions.`);
    
    const sessions = await enrichSessions(snapshot.docs);
    res.json(sessions);
  } catch (error: any) {
    console.error(`[API] getSessionsByFaculty Error:`, error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ref = db.collection('sessions').doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    await ref.delete();
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSessionsByStudent = async (req: Request, res: Response) => {
  try {
    const { id: studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required.' });
    }

    // 1. Find courses the student is enrolled in
    const enrollments = await db.collection('enrollments').where('studentId', '==', studentId).get();
    const courseIds = Array.from(new Set(enrollments.docs.map((doc) => doc.data().courseId)));
    
    if (courseIds.length === 0) {
      return res.json([]);
    }

    // 2. Fetch sessions for those courses
    let sessionDocs: admin.firestore.QueryDocumentSnapshot[] = [];
    for (let i = 0; i < courseIds.length; i += 30) {
      const chunk = courseIds.slice(i, i + 30);
      const snap = await db.collection('sessions').where('courseId', 'in', chunk).get();
      sessionDocs = sessionDocs.concat(snap.docs);
    }

    // 3. Enrich sessions with course/classroom/faculty details
    const sessions = await enrichSessions(sessionDocs);

    // 4. Attach attendance status for this specific student
    const attendanceSnap = await db.collection('attendance').where('studentId', '==', studentId).get();
    const attendedSessionIds = new Set(attendanceSnap.docs.map((doc) => doc.data().sessionId));

    const finalSessions = sessions.map(s => ({
      ...s,
      attended: attendedSessionIds.has(s.id)
    }));

    return res.json(finalSessions);
  } catch (error: any) {
    console.error('[GET_STUDENT_SESSIONS_ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
};

export const closeSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('sessions').doc(id).update({
      status: 'ended',
      endedAt: new Date().toISOString(),
    });

    res.json({ message: 'Session closed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function validateQrToken(qrToken: string) {
  const decoded = jwt.decode(qrToken) as any;
  if (!decoded || !decoded.sessionId || !decoded.secret || !decoded.expiresAt) {
    throw new Error('Invalid QR token.');
  }
  return decoded as { sessionId: string; secret: string; issuedAt: number; expiresAt: number };
}

async function generateAttendanceSummary(sessionId: string) {
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw new Error('Session not found.');
  }

  const session = sessionSnap.data() as SessionDoc;
  if (!session.courseId) {
    throw new Error('Session missing courseId.');
  }

  const enrollmentSnap = await db.collection('enrollments').where('courseId', '==', session.courseId).get();
  const studentIds = enrollmentSnap.docs.map((doc) => doc.data().studentId as string);
  const attendanceRef = sessionRef.collection('attendanceRecords');
  const attendanceSnap = await attendanceRef.get();
  const attendanceByStudent = Object.fromEntries(
    attendanceSnap.docs.map((doc) => [doc.id, doc.data() as any])
  );

  const students = await Promise.all(
    studentIds.map(async (studentId) => {
      const userSnap = await db.collection('users').doc(studentId).get();
      const studentName = userSnap.exists ? String(userSnap.data()?.name || userSnap.data()?.email || 'Unknown') : 'Unknown';
      const record = attendanceByStudent[studentId];
      const checkInAt = record?.checkInAt ?? null;
      const checkOutAt = record?.checkOutAt ?? null;
      const status = checkInAt
        ? checkOutAt
          ? 'PRESENT_FULL'
          : 'PRESENT_NO_CHECKOUT'
        : 'ABSENT';

      if (!record) {
        await attendanceRef.doc(studentId).set({
          studentId,
          studentName,
          checkInAt: null,
          checkOutAt: null,
          status: 'ABSENT',
        });
      } else if (status === 'ABSENT' && record.status !== 'ABSENT') {
        await attendanceRef.doc(studentId).set({
          ...record,
          status: 'ABSENT',
        }, { merge: true });
      }

      return {
        studentId,
        studentName,
        checkInAt,
        checkOutAt,
        status,
      };
    })
  );

  const checkedInOnly = students.filter((row) => row.status === 'PRESENT_NO_CHECKOUT').length;
  const checkedInAndOut = students.filter((row) => row.status === 'PRESENT_FULL').length;
  const totalPresent = checkedInOnly + checkedInAndOut;
  const totalAbsent = students.filter((row) => row.status === 'ABSENT').length;

  const summary = {
    totalEnrolled: students.length,
    totalPresent,
    totalAbsent,
    checkedInOnly,
    checkedInAndOut,
    students,
  };

  await sessionRef.collection('attendanceSummary').doc('summary').set(summary);
  return summary;
}

export const startSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, courseId, roomId } = req.body as { sessionId?: string; courseId?: string; roomId?: string };
    const currentUser = (req as any).currentUser;
    if (!currentUser?.uid) {
      return res.status(401).json({ error: 'unauthenticated', message: 'User not authenticated.' });
    }

    const startedAt = new Date().toISOString();
    const checkInDeadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const qrSecret = crypto.randomUUID();
    const qrRotatedAt = new Date().toISOString();

    if (sessionId) {
      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionSnap = await sessionRef.get();
      if (!sessionSnap.exists) {
        return res.status(404).json({ error: 'session_not_found', message: 'Session not found.' });
      }

      const session = sessionSnap.data() as SessionDoc;
      if (session.facultyId && session.facultyId !== currentUser.uid) {
        return res.status(403).json({ error: 'forbidden', message: 'You may only start your own session.' });
      }

      await sessionRef.update({
        status: 'active',
        startedAt,
        checkInDeadline,
        qrSecret,
        qrRotatedAt,
      });

      return res.json({ sessionId });
    }

    if (!courseId || !roomId) {
      return res.status(400).json({ error: 'sessionId or courseId and roomId are required.' });
    }

    const classroomDoc = await db.collection('classrooms').doc(roomId).get();
    if (!classroomDoc.exists) {
      return res.status(400).json({ error: 'Invalid roomId.' });
    }

    const docRef = await db.collection('sessions').add({
      courseId,
      classroomId: roomId,
      facultyId: currentUser.uid,
      status: 'active',
      startedAt,
      checkInDeadline,
      qrSecret,
      qrRotatedAt,
    });

    return res.json({ sessionId: docRef.id });
  } catch (error: any) {
    console.error('[START SESSION]', error);
    return res.status(500).json({ error: 'server_error', message: 'Failed to start session.' });
  }
};

export const endSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    await sessionRef.update({ status: 'ended', endedAt: new Date().toISOString() });
    await generateAttendanceSummary(sessionId);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[END SESSION]', error);
    return res.status(500).json({ error: 'server_error', message: 'Failed to end session.' });
  }
};

export const getSessionQr = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return res.status(404).json({ error: 'Session not found.' });
    }

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

    const expiresInMs = 30 * 1000;
    const qrToken = jwt.sign(
      {
        sessionId,
        secret: qrSecret,
        issuedAt: now.getTime(),
        expiresAt: now.getTime() + expiresInMs,
      },
      qrSecret,
      { expiresIn: '30s' }
    );

    return res.json({
      token: qrToken,
      expiresAt: new Date(now.getTime() + expiresInMs).toISOString(),
      ttlSeconds: 30,
    });
  } catch (error: any) {
    console.error('[GET SESSION QR]', error);
    return res.status(500).json({ error: 'server_error', message: 'Failed to get session QR.' });
  }
};

export const checkInWithQr = async (req: Request, res: Response) => {
  try {
    const { qrToken, gpsCoords } = req.body as { qrToken?: string; gpsCoords?: { lat?: number; lng?: number } };
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
    console.error('[CHECKIN QR]', error);
    return res.status(500).json({ error: 'server_error', message: 'Unable to process check-in.' });
  }
};

export const checkOutWithQr = async (req: Request, res: Response) => {
  try {
    const { qrToken, gpsCoords } = req.body as { qrToken?: string; gpsCoords?: { lat?: number; lng?: number } };
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
    console.error('[CHECKOUT QR]', error);
    return res.status(500).json({ error: 'server_error', message: 'Unable to process check-out.' });
  }
};

export const getSessionSummary = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const summarySnap = await db.collection('sessions').doc(sessionId).collection('attendanceSummary').doc('summary').get();
    if (!summarySnap.exists) {
      return res.status(404).json({ error: 'summary_not_found', message: 'Attendance summary not available.' });
    }

    return res.json(summarySnap.data());
  } catch (error: any) {
    console.error('[GET SUMMARY]', error);
    return res.status(500).json({ error: 'server_error', message: 'Unable to fetch attendance summary.' });
  }
};