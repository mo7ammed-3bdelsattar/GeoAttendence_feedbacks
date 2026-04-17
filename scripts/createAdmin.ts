import { auth, db } from '../server/config/firebase-admin';

async function createAdmin() {
  try {
    const userRecord = await auth.createUser({
      email: 'admin@geotest.com',
      password: 'password123',
      displayName: 'System Admin',
    });
    
    await db.collection('users').doc(userRecord.uid).set({
      email: 'admin@geotest.com',
      name: 'System Admin',
      role: 'admin',
      createdAt: new Date().toISOString()
    });

    console.log('Successfully created admin user: admin@geotest.com / password123');
    process.exit(0);
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      console.log('Admin user already exists! Please use admin@geotest.com / password123');
      process.exit(0);
    } else {
      console.error('Error creating new user:', error);
      process.exit(1);
    }
  }
}

createAdmin();
