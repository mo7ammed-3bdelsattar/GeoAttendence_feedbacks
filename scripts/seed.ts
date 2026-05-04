import { db, auth as adminAuth } from '../server/config/firebase-admin';

async function clearCollection(collectionPath: string) {
  const snapshot = await db.collection(collectionPath).get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Cleared collection: ${collectionPath}`);
}

async function seedDatabase() {
  console.log('🚀 Starting Robust Seeding (1 Year, 2 Semesters)...');

  // 1. Clear existing data (optional but recommended for fresh start)
  const collections = ['users', 'departments', 'classrooms', 'courses', 'enrollments', 'sessions', 'attendance', 'feedback', 'groups', 'policies', 'chats'];
  // Note: We don't clear Firebase Auth automatically here to avoid massive deletions, but for a true reset, one might use CLI.

  // 2. Departments
  const departments = [
    { id: 'dept-cs', name: 'Computer Science', code: 'CS' },
    { id: 'dept-eng', name: 'Engineering', code: 'ENG' },
    { id: 'dept-lit', name: 'English Literature', code: 'LIT' },
    { id: 'dept-math', name: 'Mathematics', code: 'MATH' },
  ];
  for (const d of departments) await db.collection('departments').doc(d.id).set(d);

  // 3. Classrooms
  const classrooms = [
    { id: 'room-101', name: 'Hall 101', building: 'Main Hall', lat: 30.0444, lng: 31.2357, geofenceRadiusMeters: 50 },
    { id: 'room-102', name: 'Lab 102', building: 'CS Building', lat: 30.0445, lng: 31.2358, geofenceRadiusMeters: 30 },
    { id: 'room-103', name: 'Workshop 103', building: 'Engineering Lab', lat: 30.0446, lng: 31.2359, geofenceRadiusMeters: 40 },
  ];
  for (const c of classrooms) await db.collection('classrooms').doc(c.id).set(c);

  // 4. Users (Admin, Instructors, Students) - Arabic Names Transliterated
  const password = 'password123';
  const userList = [
    // Admins
    { email: 'admin@uni.edu', name: 'Mohammed Abdul Sattar', role: 'admin' },
    { email: 'ali.admin@uni.edu', name: 'Ali Hassan', role: 'admin' },
    
    // Faculty (Instructors)
    { id: 'inst-ahmed', email: 'ahmed.m@uni.edu', name: 'Dr. Ahmed Mansour', role: 'faculty' },
    { id: 'inst-fatima', email: 'fatima.z@uni.edu', name: 'Dr. Fatima Zahra', role: 'faculty' },
    { id: 'inst-omar', email: 'omar.k@uni.edu', name: 'Dr. Omar Khattab', role: 'faculty' },
    { id: 'inst-leila', email: 'leila.a@uni.edu', name: 'Dr. Leila Al-Aswany', role: 'faculty' },
    
    // Students
    { id: 'stud-youssef', email: 'youssef@uni.edu', name: 'Youssef Ibrahim', role: 'student' },
    { id: 'stud-mariam', email: 'mariam@uni.edu', name: 'Mariam Mahmoud', role: 'student' },
    { id: 'stud-zainab', email: 'zainab@uni.edu', name: 'Zainab Qassim', role: 'student' },
    { id: 'stud-khaled', email: 'khaled@uni.edu', name: 'Khaled bin Waleed', role: 'student' },
    { id: 'stud-nour', email: 'nour@uni.edu', name: 'Nour Al-Huda', role: 'student' },
    { id: 'stud-hassan', email: 'hassan@uni.edu', name: 'Hassan Al-Basri', role: 'student' },
    { id: 'stud-amina', email: 'amina@uni.edu', name: 'Amina Bint Wahab', role: 'student' },
    { id: 'stud-tareq', email: 'tareq@uni.edu', name: 'Tareq bin Ziyad', role: 'student' },
    { id: 'stud-salma', email: 'salma@uni.edu', name: 'Salma Rashid', role: 'student' },
    { id: 'stud-mustafa', email: 'mustafa@uni.edu', name: 'Mustafa Kamel', role: 'student' },
  ];

  const instructorIds: string[] = [];
  const studentIds: string[] = [];

  for (const u of userList) {
    try {
      let uid = u.id || '';
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

  // 5. Courses & Groups (2 Semesters)
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

    // Create a group for each course
    const groupId = `group-${c.id}`;
    await db.collection('groups').doc(groupId).set({
      id: groupId,
      courseId: c.id,
      facultyId: c.inst,
      name: 'Main Group',
      createdAt: new Date().toISOString()
    });

    // Enroll all students in CS101 and CS202, half in others
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

  // 6. Sessions, Attendance, Feedback (Simulating 1 year)
  // Semester 1: Fall 2025 (Sept - Dec)
  // Semester 2: Spring 2026 (Jan - May)
  const semesterDates = [
    { name: 'Fall 2025', start: new Date('2025-09-01'), end: new Date('2025-12-15') },
    { name: 'Spring 2026', start: new Date('2026-01-15'), end: new Date('2026-05-30') },
  ];

  for (const sem of semesterDates) {
    console.log(`Generating sessions for ${sem.name}...`);
    for (const c of courses) {
      const groupId = `group-${c.id}`;
      // Generate 4 historical sessions per course per semester for seeding speed
      for (let i = 0; i < 4; i++) {
        const sessionDate = new Date(sem.start.getTime() + Math.random() * (sem.end.getTime() - sem.start.getTime()));
        const sessionId = `sess-${c.id}-${sem.name.replace(' ', '')}-${i}`;
        
        await db.collection('sessions').doc(sessionId).set({
          id: sessionId,
          courseId: c.id,
          groupId: groupId,
          facultyId: c.inst,
          classroomId: classrooms[i % 3].id,
          date: sessionDate.toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '11:00',
          status: 'ended',
          createdAt: new Date().toISOString()
        });

        // Seed some attendance
        const enrolledStudents = (c.id.startsWith('cs')) ? studentIds : studentIds.slice(0, 5);
        for (const sid of enrolledStudents) {
          if (Math.random() > 0.2) { // 80% attendance rate
             await db.collection('attendance').add({
               sessionId: sessionId,
               studentId: sid,
               status: 'present',
               timestamp: new Date(sessionDate.getTime() + 10 * 60000).toISOString(),
               latitude: classrooms[i % 3].lat + (Math.random() * 0.0001),
               longitude: classrooms[i % 3].lng + (Math.random() * 0.0001)
             });
          }
        }
      }

      // Seed feedback (1 per course per student per semester)
      const enrolledStudents = (c.id.startsWith('cs')) ? studentIds : studentIds.slice(0, 5);
      for (const sid of enrolledStudents) {
        await db.collection('feedback').add({
          studentId: sid,
          courseId: c.id,
          groupId: groupId,
          rating: 3 + Math.floor(Math.random() * 3), // 3 to 5 stars
          message: 'The course is very helpful and the Arabic literature part is fascinating.',
          semester: sem.name,
          createdAt: new Date(sem.end.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }
  }

  // 7. Policies & FAQ for Chatbot
  const policies = [
    { title: 'Attendance Policy', content: 'Students must maintain 75% attendance to take the final exam. Check-in is only valid within 50m of the classroom.', keywords: ['absent', 'late', '75', 'threshold'] },
    { title: 'Grading System', content: 'A: 90-100, B: 80-89, C: 70-79, D: 60-69, F: Below 60.', keywords: ['grades', 'exam', 'marks', 'fail'] },
    { title: 'Feedback Anonymity', content: 'All feedback submitted is anonymous to the instructor. Only system administrators can see student identities for quality control.', keywords: ['anonymous', 'privacy', 'identity'] },
  ];
  for (const p of policies) await db.collection('policies').add({ ...p, updatedAt: new Date().toISOString() });

  console.log('✅ Robust Seeding Completed!');
}

seedDatabase().catch(console.error);
