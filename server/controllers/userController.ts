import { Request, Response } from 'express';
import admin, { db, auth as adminAuth } from '../config/firebase-admin';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const usersCol = db.collection('users');
    let q: admin.firestore.Query = usersCol;

    if (role) {
      q = usersCol.where('role', '==', String(role));
    }

    const snapshot = await q.get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const { email, password, name, role } = payload;

    const userAuth = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const newUser = {
      id: userAuth.uid,
      name,
      email,
      role: role ?? 'student',
    };

    await db.collection('users').doc(userAuth.uid).set(newUser);
    res.status(201).json(newUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const userId = String(id);
    await db.collection('users').doc(userId).update(payload);
    const updated = await db.collection('users').doc(userId).get();

    res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const userId = String(id);
    await adminAuth.deleteUser(userId);
    await db.collection('users').doc(userId).delete();

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).currentUser as { uid?: string } | undefined;
    if (!currentUser?.uid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }

    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    return res.json({ id: userDoc.id, ...userDoc.data() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).currentUser as { uid?: string } | undefined;
    if (!currentUser?.uid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }

    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = { id: userDoc.id, ...userDoc.data() } as Record<string, any>;
    const normalizedImage = userData.avatar || userData.profileImage || null;
    userData.avatar = normalizedImage;
    userData.profileImage = normalizedImage;
    const role = String(userData.role || '').toLowerCase();
    let summary: Record<string, number> = {};

    if (role === 'faculty' || role === 'doctor') {
      const [coursesSnap, sessionsSnap] = await Promise.all([
        db.collection('courses').where('facultyId', '==', currentUser.uid).get(),
        db.collection('sessions').where('facultyId', '==', currentUser.uid).get()
      ]);
      const courseIds = coursesSnap.docs.map((doc) => doc.id);

      let studentCount = 0;
      if (courseIds.length > 0) {
        const enrollmentsByCourse = await Promise.all(
          courseIds.map((courseId) => db.collection('enrollments').where('courseId', '==', courseId).get())
        );
        const students = new Set<string>();
        enrollmentsByCourse.forEach((snap) => {
          snap.docs.forEach((doc) => {
            const enrollment = doc.data() as { studentId?: string };
            if (enrollment.studentId) students.add(String(enrollment.studentId));
          });
        });
        studentCount = students.size;
      }

      summary = {
        courses: coursesSnap.size,
        sessions: sessionsSnap.size,
        students: studentCount
      };
    } else if (role === 'admin') {
      const [usersSnap, sessionsSnap, coursesSnap, feedbackSnap] = await Promise.all([
        db.collection('users').get(),
        db.collection('sessions').get(),
        db.collection('courses').get(),
        db.collection('feedback').get()
      ]);
      summary = {
        users: usersSnap.size,
        reports: feedbackSnap.size,
        statistics: sessionsSnap.size + coursesSnap.size
      };
    } else {
      const [enrollmentsSnap, attendanceSnap] = await Promise.all([
        db.collection('enrollments').where('studentId', '==', currentUser.uid).get(),
        db.collection('attendance').where('studentId', '==', currentUser.uid).get()
      ]);
      summary = {
        attendance: attendanceSnap.size,
        enrolledCourses: enrollmentsSnap.size
      };
    }

    return res.json({ ...userData, summary });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).currentUser as { uid?: string } | undefined;
    if (!currentUser?.uid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length < 2 || name.length > 80) {
      return res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
    }

    await Promise.all([
      db.collection('users').doc(currentUser.uid).update({ name }),
      adminAuth.updateUser(currentUser.uid, { displayName: name })
    ]);

    const updated = await db.collection('users').doc(currentUser.uid).get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const uploadMyAvatar = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).currentUser as { uid?: string } | undefined;
    if (!currentUser?.uid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required.' });
    }

    const allowedMimeTypes = new Set(['image/jpeg', 'image/png']);
    if (!allowedMimeTypes.has(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only jpg and png images are allowed.' });
    }

    const uploadsDir = path.resolve(process.cwd(), 'uploads', 'avatars');
    await mkdir(uploadsDir, { recursive: true });

    const extension = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const fileName = `${currentUser.uid}-${Date.now()}.${extension}`;
    const fullPath = path.join(uploadsDir, fileName);

    await writeFile(fullPath, req.file.buffer);

    const avatarPath = `/uploads/avatars/${fileName}`;
    await db.collection('users').doc(currentUser.uid).update({ avatar: avatarPath, profileImage: avatarPath });

    const updated = await db.collection('users').doc(currentUser.uid).get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const uploadProfileImage = uploadMyAvatar;
