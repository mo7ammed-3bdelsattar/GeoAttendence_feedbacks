import { db } from '../config/firebase-admin';

async function deleteCollection(collectionPath: string) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function seed() {
  console.log('--- Starting Seeder (Safe Mode - No Deletion) ---');

  const collections = ['users', 'departments', 'courses', 'classrooms', 'sessions', 'enrollments', 'attendance', 'notifications', 'feedback'];
  /* 
  for (const col of collections) {
    console.log(`🧹 Cleaning: ${col}`);
    await deleteCollection(col);
  }
  */

  console.log('🏛️  Seeding Departments...');
  const depts = [
    { name: 'كلية الهندسة', code: 'ENG' },
    { name: 'علوم الحاسب والذكاء الاصطناعي', code: 'CSAI' },
    { name: 'نظم المعلومات الإدارية', code: 'MIS' }
  ];
  const deptRefs = await Promise.all(depts.map(d => db.collection('departments').add(d)));

  console.log('📍 Seeding Classrooms...');
  const rooms = [
    { name: 'المدرج الكبير', code: 'AUD-01', capacity: 200, lat: 30.0444, lng: 31.2357, geofenceRadiusMeters: 80 },
    { name: 'معمل البرمجيات 4', code: 'LAB-04', capacity: 40, lat: 30.0441, lng: 31.2359, geofenceRadiusMeters: 40 },
    { name: 'قاعة الشبكات', code: 'HALL-N', capacity: 60, lat: 30.0447, lng: 31.2355, geofenceRadiusMeters: 50 },
    { name: 'قاعة 202 - نظم', code: 'R202', capacity: 30, lat: 30.0440, lng: 31.2360, geofenceRadiusMeters: 30 }
  ];
  const roomRefs = await Promise.all(rooms.map(r => db.collection('classrooms').add(r)));

  console.log('👥 Seeding Users (Arabic names & Real-style emails)...');
  const admins = [
    { id: 'admin-1', name: 'مدير النظام', email: 'admin@uni.edu', role: 'admin', password: 'password123' },
    { id: 'admin-2', name: 'أحمد أيمن', email: 'ahmedaymanmido307@gmail.com', role: 'admin', password: 'password123' }
  ];
  const faculty = [
    { id: 'f-mohamed', name: 'د. محمد علي', email: 'm.ali@uni.edu', role: 'faculty', deptId: deptRefs[1].id, password: 'password123' },
    { id: 'f-ahmed', name: 'د. أحمد محمود', email: 'a.mahmoud@uni.edu', role: 'faculty', deptId: deptRefs[1].id, password: 'password123' },
    { id: 'f-hassan', name: 'د. حسن عبد الله', email: 'h.abdallah@uni.edu', role: 'faculty', deptId: deptRefs[0].id, password: 'password123' }
  ];
  const students = [
    { id: 's-yassin', name: 'ياسين محمد السعدي', email: 'yassin.mohamed@student.uni.edu', role: 'student', password: 'password123' },
    { id: 's-omar', name: 'عمر خالد', email: 'omar.khaled@student.uni.edu', role: 'student', password: 'password123' },
    { id: 's-fatma', name: 'فاطمة الزهراء', email: 'fatma.alzahraa@student.uni.edu', role: 'student', password: 'password123' },
    { id: 's-nour', name: 'نور الدين مصطفى', email: 'nour.mustafa@student.uni.edu', role: 'student', password: 'password123' }
  ];

  const allUsers = [...admins, ...faculty, ...students];
  await Promise.all(allUsers.map(u => db.collection('users').doc(u.id).set(u)));

  console.log('📚 Seeding Courses...');
  const courses = [
    { code: 'CS101', name: 'هيكلة البيانات والخوارزميات', departmentId: deptRefs[1].id, facultyId: 'f-mohamed' },
    { code: 'CS202', name: 'تطوير تطبيقات الويب الحديثة', departmentId: deptRefs[1].id, facultyId: 'f-mohamed' },
    { code: 'AI301', name: 'أساسيات الذكاء الاصطناعي', departmentId: deptRefs[1].id, facultyId: 'f-ahmed' },
    { code: 'ENG105', name: 'الديناميكا الحرارية', departmentId: deptRefs[0].id, facultyId: 'f-hassan' }
  ];
  const courseRefs = await Promise.all(courses.map(c => db.collection('courses').add(c)));

  console.log('📝 Seeding Enrollments...');
  const enrollmentPairs = [
    { studentId: 's-yassin', courseId: courseRefs[0].id },
    { studentId: 's-yassin', courseId: courseRefs[1].id },
    { studentId: 's-omar', courseId: courseRefs[0].id },
    { studentId: 's-omar', courseId: courseRefs[2].id },
    { studentId: 's-fatma', courseId: courseRefs[1].id },
    { studentId: 's-nour', courseId: courseRefs[0].id },
    { studentId: 's-nour', courseId: courseRefs[1].id },
    { studentId: 's-nour', courseId: courseRefs[2].id }
  ];
  await Promise.all(enrollmentPairs.map(e => db.collection('enrollments').add({ ...e, enrolledAt: new Date().toISOString() })));

  console.log('📅 Seeding Sessions...');
  const today = new Date().toISOString().split('T')[0];
  const sessions = [
    { courseId: courseRefs[0].id, facultyId: 'f-mohamed', classroomId: roomRefs[1].id, date: today, startTime: '09:00', endTime: '11:00', topic: 'التعقيد الزمني للخوارزميات', status: 'UPCOMING' },
    { courseId: courseRefs[1].id, facultyId: 'f-mohamed', classroomId: roomRefs[2].id, date: today, startTime: '12:00', endTime: '14:00', topic: 'مقدمة في مكتبة React', status: 'UPCOMING' },
    { courseId: courseRefs[2].id, facultyId: 'f-ahmed', classroomId: roomRefs[0].id, date: today, startTime: '14:30', endTime: '16:30', topic: 'نماذج التعلم الخاضع للإشراف', status: 'UPCOMING' },
    { courseId: courseRefs[3].id, facultyId: 'f-hassan', classroomId: roomRefs[0].id, date: today, startTime: '10:00', endTime: '13:00', topic: 'قوانين الديناميكا الحرارية', status: 'UPCOMING' }
  ];
  await Promise.all(sessions.map(s => db.collection('sessions').add(s)));

  console.log('✅ Seeding Complete with Arabic assets!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeder Failed:', err);
  process.exit(1);
});
