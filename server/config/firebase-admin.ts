import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account.json';
const absolutePath = path.resolve(process.cwd(), serviceAccountPath);

// Support for individual env vars (Option B)
const inlineConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

function getCredential() {
  // 1. Try file
  if (fs.existsSync(absolutePath)) {
    console.log('[FIREBASE-ADMIN] Using service account file.');
    return admin.credential.cert(absolutePath);
  }

  // 2. Try inline environment variables
  if (inlineConfig.projectId && inlineConfig.clientEmail && inlineConfig.privateKey) {
    console.log('[FIREBASE-ADMIN] Using individual environment variables.');
    return admin.credential.cert(inlineConfig as admin.ServiceAccount);
  }

  // 3. Fallback to default (likely to fail without GOOGLE_APPLICATION_CREDENTIALS)
  console.warn('[FIREBASE-ADMIN] No valid credentials found. Ensure service-account.json exists or check .env variables.');
  return admin.credential.applicationDefault();
}

try {
  admin.initializeApp({
    credential: getCredential(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  console.log('[FIREBASE-ADMIN] Initialized successfully.');
} catch (error: any) {
  console.error('[FIREBASE-ADMIN] Initialization failed:', error.message);
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

export default admin;
