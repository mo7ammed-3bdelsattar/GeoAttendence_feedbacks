import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';
import { hasTimeOverlap, validateSessionPayload } from '../models/sessionModel';

type SessionDoc = {
  courseId: string;
  facultyId: string;
  classroomId: string;
  date: string;
  startTime: string;
  endTime: string;
  createdAt: string;
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
      createdAt
    });
    const newSession = { id: docRef.id, ...payload, createdAt };

    res.status(201).json(newSession);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
    if (!id) {
      return res.status(400).json({ error: 'faculty id is required.' });
    }

    const snapshot = await db.collection('sessions').where('facultyId', '==', id).get();
    const sessions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(sessions);
  } catch (error: any) {
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

    const enrollments = await db.collection('enrollments').where('studentId', '==', studentId).get();
    const courseIds = Array.from(new Set(enrollments.docs.map((doc) => doc.data().courseId)));
    if (courseIds.length === 0) {
      return res.json([]);
    }

    let sessions: any[] = [];
    for (let i = 0; i < courseIds.length; i += 30) {
      const chunk = courseIds.slice(i, i + 30);
      const snap = await db.collection('sessions').where('courseId', 'in', chunk).get();
      snap.docs.forEach((doc) => sessions.push({ id: doc.id, ...doc.data() }));
    }

    const [coursesSnap, classroomsSnap, attendanceSnap] = await Promise.all([
      db.collection('courses').get(),
      db.collection('classrooms').get(),
      db.collection('attendance').where('studentId', '==', studentId).get()
    ]);
    const courseMap = Object.fromEntries(coursesSnap.docs.map((doc) => [doc.id, doc.data()]));
    const classroomMap = Object.fromEntries(classroomsSnap.docs.map((doc) => [doc.id, doc.data()]));
    const attendedSessionIds = new Set(attendanceSnap.docs.map((doc) => doc.data().sessionId));

    const normalized = sessions.map((session) => {
      const course = courseMap[session.courseId] as any;
      const classroom = classroomMap[session.classroomId] as any;
      return {
        ...session,
        courseName: session.courseName || course?.name || 'Unknown Course',
        courseCode: course?.code || 'N/A',
        classroomName: classroom?.name || session.classroomName || 'Unknown Classroom',
        attended: attendedSessionIds.has(session.id)
      };
    });

    return res.json(normalized);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
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