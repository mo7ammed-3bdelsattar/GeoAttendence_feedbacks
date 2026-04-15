import { db, auth as adminAuth } from '../server/config/firebase-admin';

async function seedDatabase() {
  console.log('Seeding database...');

  // Seed users
  const users = [
    { email: 'student@uni.edu', password: 'password123', name: 'John Student', role: 'student' },
    { email: 'faculty@uni.edu', password: 'password123', name: 'Dr. Jane Faculty', role: 'faculty' },
    { email: 'admin@uni.edu', password: 'password123', name: 'Admin User', role: 'admin' },
  ];

  for (const userData of users) {
    try {
      const userRecord = await adminAuth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.name,
      });
      await db.collection('users').doc(userRecord.uid).set({
        name: userData.name,
        email: userData.email,
        role: userData.role,
      });
      console.log(`User ${userData.email} created with UID: ${userRecord.uid}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`User ${userData.email} already exists`);
      } else {
        console.error(`Error creating user ${userData.email}:`, error);
      }
    }
  }
  console.log('Users seeded');

  // Seed departments
  const departments = [
    { id: 'd1', name: 'Computer Science', code: 'CS' },
    { id: 'd2', name: 'Mathematics', code: 'MATH' },
    { id: 'd3', name: 'Physics', code: 'PHY' },
  ];

  for (const dept of departments) {
    await db.collection('departments').doc(dept.id).set(dept);
  }
  console.log('Departments seeded');

  // Seed classrooms
  const classrooms = [
    { id: 'c1', name: 'Room 101', building: 'Main Building', lat: 30.0444, lng: 31.2357, geofenceRadiusMeters: 50 },
    { id: 'c2', name: 'Lab 201', building: 'Science Building', lat: 30.0445, lng: 31.2358, geofenceRadiusMeters: 30 },
  ];

  for (const classroom of classrooms) {
    await db.collection('classrooms').doc(classroom.id).set(classroom);
  }
  console.log('Classrooms seeded');

  // Seed courses
  const courses = [
    { id: 'course1', name: 'Introduction to Programming', code: 'CS101', departmentId: 'd1', departmentName: 'Computer Science', enrolledCount: 45 },
    { id: 'course2', name: 'Calculus I', code: 'MATH101', departmentId: 'd2', departmentName: 'Mathematics', enrolledCount: 32 },
  ];

  for (const course of courses) {
    await db.collection('courses').doc(course.id).set(course);
  }
  console.log('Courses seeded');

  console.log('Database seeded successfully!');
}

seedDatabase().catch(console.error);