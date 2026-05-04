import { db, auth as adminAuth } from '../config/firebase-admin';

async function clearCollection(collectionPath: string) {
  const snapshot = await db.collection(collectionPath).get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function seed() {
  console.log('🚀 Starting Evaluation Seeder (1 Year, 2 Semesters)...');

  // 1. Clear existing data
  const collections = ['users', 'departments', 'courses', 'classrooms', 'sessions', 'enrollments', 'attendance', 'feedback', 'groups', 'policies', 'chats'];
  for (const col of collections) {
    console.log(`🧹 Cleaning: ${col}`);
    await clearCollection(col);
  }

  // 2. Seed Departments
  console.log('🏛️  Seeding Departments...');
  const departments = [
    { id: 'dept-cs', name: 'Computer Science', code: 'CS' },
    { id: 'dept-eng', name: 'Engineering', code: 'ENG' },
    { id: 'dept-lit', name: 'English Literature', code: 'LIT' },
    { id: 'dept-math', name: 'Mathematics', code: 'MATH' },
  ];
  for (const d of departments) await db.collection('departments').doc(d.id).set(d);

  // 3. Seed Classrooms
  console.log('📍 Seeding Classrooms...');
  const classrooms = [
    { id: 'room-101', name: 'Hall 101', building: 'Main Hall', lat: 30.0444, lng: 31.2357, geofenceRadiusMeters: 50 },
    { id: 'room-102', name: 'Lab 102', building: 'CS Building', lat: 30.0441, lng: 31.2359, geofenceRadiusMeters: 30 },
    { id: 'room-103', name: 'Workshop 103', building: 'Engineering Lab', lat: 30.0447, lng: 31.2355, geofenceRadiusMeters: 40 },
  ];
  for (const c of classrooms) await db.collection('classrooms').doc(c.id).set(c);

  // 4. Seed Users (Arabic names in English letters)
  console.log('👥 Seeding Users...');
  const password = 'password123';
  const userList = [
    { email: 'admin@uni.edu', name: 'Mohammed Abdul Sattar', role: 'admin' },
    { email: 'ali.hassan@uni.edu', name: 'Ali Hassan', role: 'admin' },
    { email: 'ahmed.mansour@uni.edu', name: 'Ahmed Mansour', role: 'faculty' },
    { email: 'fatima.zahra@uni.edu', name: 'Fatima Zahra', role: 'faculty' },
    { email: 'omar.khattab@uni.edu', name: 'Omar Khattab', role: 'faculty' },
    { email: 'leila.aswany@uni.edu', name: 'Leila Al-Aswany', role: 'faculty' },
    { email: 'youssef.ibrahim@uni.edu', name: 'Youssef Ibrahim', role: 'student' },
    { email: 'mariam.mahmoud@uni.edu', name: 'Mariam Mahmoud', role: 'student' },
    { email: 'zainab.qassim@uni.edu', name: 'Zainab Qassim', role: 'student' },
    { email: 'khaled.waleed@uni.edu', name: 'Khaled Waleed', role: 'student' },
    { email: 'nour.huda@uni.edu', name: 'Nour Al-Huda', role: 'student' },
    { email: 'hassan.basri@uni.edu', name: 'Hassan Basri', role: 'student' },
    { email: 'amina.wahab@uni.edu', name: 'Amina Wahab', role: 'student' },
    { email: 'tareq.ziyad@uni.edu', name: 'Tareq Ziyad', role: 'student' },
    { email: 'salma.rashid@uni.edu', name: 'Salma Rashid', role: 'student' },
    { email: 'mustafa.kamel@uni.edu', name: 'Mustafa Kamel', role: 'student' },
  ];

  const instructorIds: string[] = [];
  const studentIds: string[] = [];

  for (const u of userList) {
    try {
      let uid = '';
      try {
        const userRecord = await adminAuth.createUser({
          email: u.email,
          password: password,
          displayName: u.name,
        });
        uid = userRecord.uid;
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-exists') {
          const existing = await adminAuth.getUserByEmail(u.email);
          uid = existing.uid;
          await adminAuth.updateUser(uid, { password }); // Reset password for evaluation
        } else throw authError;
      }

      await db.collection('users').doc(uid).set({
        id: uid,
        name: u.name,
        email: u.email,
        password: password, // For easy evaluation login
        role: u.role,
        createdAt: new Date().toISOString()
      });

      if (u.role === 'faculty') instructorIds.push(uid);
      if (u.role === 'student') studentIds.push(uid);
      console.log(`User ${u.name} synced.`);
    } catch (e) {
      console.error(`Error syncing user ${u.name}:`, e);
    }
  }

  // 5. Seed Courses & Groups
  console.log('📚 Seeding Courses & Groups...');
  const courses = [
    { id: 'cs101', name: 'Intro to Algorithms', dept: 'dept-cs', inst: instructorIds[0] },
    { id: 'cs202', name: 'Database Systems', dept: 'dept-cs', inst: instructorIds[1] },
    { id: 'eng301', name: 'Structural Analysis', dept: 'dept-eng', inst: instructorIds[2] },
    { id: 'lit101', name: 'Arabic Poetry', dept: 'dept-lit', inst: instructorIds[3] },
  ];

  for (const c of courses) {
    await db.collection('courses').doc(c.id).set({
      id: c.id,
      name: c.name,
      departmentId: c.dept,
      facultyId: c.inst,
      createdAt: new Date().toISOString()
    });

    const groupId = `group-${c.id}`;
    await db.collection('groups').doc(groupId).set({
      id: groupId,
      courseId: c.id,
      facultyId: c.inst,
      name: 'Group A',
      createdAt: new Date().toISOString()
    });

    // Enroll students
    const targetStudents = (c.id.startsWith('cs')) ? studentIds : studentIds.slice(0, 5);
    for (const sid of targetStudents) {
      await db.collection('enrollments').add({
        studentId: sid,
        courseId: c.id,
        groupId: groupId,
        enrolledAt: new Date().toISOString()
      });
    }
  }

  // 6. Seed Sessions, Attendance, Feedback (Simulating 1 year)
  console.log('📅 Seeding Historical Sessions, Attendance & Feedback...');
  const semesters = [
    { name: 'Fall 2025', start: new Date('2025-09-01'), end: new Date('2025-12-15') },
    { name: 'Spring 2026', start: new Date('2026-01-15'), end: new Date('2026-05-30') },
  ];

  for (const sem of semesters) {
    for (const c of courses) {
      const groupId = `group-${c.id}`;
      // Generate 5 historical sessions per semester
      for (let i = 0; i < 5; i++) {
        const sessionDate = new Date(sem.start.getTime() + Math.random() * (sem.end.getTime() - sem.start.getTime()));
        const sessionId = `sess-${c.id}-${sem.name.replace(' ', '')}-${i}`;
        const room = classrooms[i % classrooms.length];
        
        await db.collection('sessions').doc(sessionId).set({
          id: sessionId,
          courseId: c.id,
          groupId: groupId,
          facultyId: instructorIds[courses.indexOf(c)],
          classroomId: room.id,
          date: sessionDate.toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '11:00',
          status: 'ended',
          createdAt: new Date().toISOString()
        });

        // Attendance
        const enrolledStudents = (c.id.startsWith('cs')) ? studentIds : studentIds.slice(0, 5);
        for (const sid of enrolledStudents) {
          if (Math.random() > 0.15) { // 85% attendance
             await db.collection('attendance').add({
               sessionId: sessionId,
               studentId: sid,
               status: 'present',
               timestamp: new Date(sessionDate.getTime() + 15 * 60000).toISOString(),
               latitude: room.lat + (Math.random() * 0.0001),
               longitude: room.lng + (Math.random() * 0.0001)
             });
          }
        }
      }

      // Feedback
      const enrolledStudents = (c.id.startsWith('cs')) ? studentIds : studentIds.slice(0, 5);
      for (const sid of enrolledStudents) {
        await db.collection('feedback').add({
          studentId: sid,
          courseId: c.id,
          groupId: groupId,
          rating: 4 + Math.floor(Math.random() * 2), // 4-5 stars
          message: 'Excellent course and instructor!',
          semester: sem.name,
          createdAt: new Date(sem.end.getTime() - 1000000).toISOString()
        });
      }
    }
  }

  // 7. Policies
  console.log('📜 Seeding Policies...');
  const policies = [
    { title: 'Attendance Rules', content: 'Minimum 75% attendance required. Geofence radius is 50m.', keywords: ['absent', 'late', '75%'] },
    { title: 'Grading Policy', content: 'A+ (95-100), A (90-94), B+ (85-89), B (80-84), C (70-79).', keywords: ['grades', 'exam'] },
  ];
  for (const p of policies) await db.collection('policies').add({ ...p, updatedAt: new Date().toISOString() });

  console.log('✅ Robust Evaluation Seeder Complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeder Failed:', err);
  process.exit(1);
});
