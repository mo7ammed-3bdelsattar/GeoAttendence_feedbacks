import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

const DEFAULT_RADIUS_METERS = 50;

function toSessionDateTime(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00`);
}

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

export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { studentId, sessionId, latitude, longitude } = req.body as {
      studentId?: string;
      sessionId?: string;
      latitude?: number;
      longitude?: number;
    };

    if (!studentId || !sessionId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'studentId, sessionId, latitude and longitude are required.' });
    }

    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const sessionData = sessionDoc.data() as {
      courseId?: string;
      classroomId?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
    };

    if (!sessionData.courseId || !sessionData.classroomId || !sessionData.date || !sessionData.startTime || !sessionData.endTime) {
      return res.status(400).json({ error: 'Session has incomplete schedule/classroom data.' });
    }

    const already = await db
      .collection('attendance')
      .where('studentId', '==', studentId)
      .where('sessionId', '==', sessionId)
      .limit(1)
      .get();
    if (!already.empty) {
      return res.status(409).json({ error: 'Already attended' });
    }

    const now = new Date();
    const startsAt = toSessionDateTime(sessionData.date, sessionData.startTime);
    const endsAt = toSessionDateTime(sessionData.date, sessionData.endTime);
    if (now < startsAt || now > endsAt) {
      return res.status(409).json({ error: 'Session not active' });
    }

    const enrollment = await db
      .collection('enrollments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', sessionData.courseId)
      .limit(1)
      .get();
    if (enrollment.empty) {
      return res.status(403).json({ error: 'Student is not enrolled in this course.' });
    }

    const classroomDoc = await db.collection('classrooms').doc(sessionData.classroomId).get();
    if (!classroomDoc.exists) {
      return res.status(400).json({ error: 'Classroom not found for this session.' });
    }
    const classroom = classroomDoc.data() as { lat?: number; lng?: number; geofenceRadiusMeters?: number };
    if (classroom.lat === undefined || classroom.lng === undefined) {
      return res.status(400).json({ error: 'Classroom location is not configured.' });
    }

    const allowedRadius = Number(classroom.geofenceRadiusMeters ?? DEFAULT_RADIUS_METERS);
    const distanceMeters = haversineMeters(latitude, longitude, classroom.lat, classroom.lng);
    if (distanceMeters > allowedRadius) {
      return res.status(409).json({
        error: 'You are too far from classroom',
        distanceMeters: Math.round(distanceMeters),
        allowedRadiusMeters: allowedRadius
      });
    }

    const attendance = {
      studentId,
      sessionId,
      status: 'present' as const,
      latitude,
      longitude,
      timestamp: now.toISOString()
    };

    const ref = await db.collection('attendance').add(attendance);
    return res.status(201).json({ id: ref.id, ...attendance });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAttendanceBySession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const [attendanceSnap, sessionDoc] = await Promise.all([
      db.collection('attendance').where('sessionId', '==', sessionId).get(),
      db.collection('sessions').doc(sessionId).get()
    ]);
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const session = sessionDoc.data() as { courseId?: string };
    const presentRows = attendanceSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Array<{ studentId: string }>;
    const presentCount = presentRows.length;

    let enrolledCount = 0;
    if (session.courseId) {
      const enrollmentSnap = await db.collection('enrollments').where('courseId', '==', session.courseId).get();
      enrolledCount = enrollmentSnap.size;
    }

    return res.json({
      sessionId,
      presentCount,
      absentCount: Math.max(0, enrolledCount - presentCount),
      records: presentRows
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAttendanceByFaculty = async (req: Request, res: Response) => {
  try {
    const { facultyId } = req.params;
    if (!facultyId) {
      return res.status(400).json({ error: 'facultyId is required.' });
    }

    const sessionsSnap = await db.collection('sessions').where('facultyId', '==', facultyId).get();
    const sessions = sessionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Array<{ id: string; courseId: string }>;

    const summaries = await Promise.all(
      sessions.map(async (session) => {
        const [presentSnap, enrollmentSnap] = await Promise.all([
          db.collection('attendance').where('sessionId', '==', session.id).get(),
          db.collection('enrollments').where('courseId', '==', session.courseId).get()
        ]);
        const presentCount = presentSnap.size;
        const enrolledCount = enrollmentSnap.size;
        return {
          sessionId: session.id,
          presentCount,
          absentCount: Math.max(0, enrolledCount - presentCount)
        };
      })
    );

    return res.json(summaries);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
