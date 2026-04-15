import admin from './server/config/firebase-admin';

async function testFirestore() {
  console.log('Testing Firestore connection...');
  try {
    const db = admin.firestore();
    console.log('Project ID:', db.projectId);
    const collections = await db.listCollections();
    console.log('Successfully connected. Collections found:', collections.length);
  } catch (err: any) {
    console.error('Firestore connection FAILED:', err.message);
    if (err.message.includes('projectId')) {
      console.error('CRITICAL: Project ID is missing or invalid!');
    }
  }
}

testFirestore();
