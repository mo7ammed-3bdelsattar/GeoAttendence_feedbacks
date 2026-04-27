const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const serviceAccountPath = path.resolve(__dirname, '../src/assets/service-account-1.json');
const cert = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(cert),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

async function test() {
  try {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log('Successfully connected to Firebase Storage. Files found:', files.length);
  } catch (err) {
    console.error('Failed to connect to Firebase Storage:', err.message);
  }
}

test();
