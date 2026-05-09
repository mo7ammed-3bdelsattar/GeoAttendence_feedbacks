import admin from 'firebase-admin';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

config();

function getCredential() {
  // 1. Prioritize individual environment variables (Best for Render/Vercel)
  const inlineConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (inlineConfig.projectId && inlineConfig.clientEmail && inlineConfig.privateKey) {
    console.log('[FIREBASE-ADMIN] Using individual environment variables (Production Mode).');
    return admin.credential.cert(inlineConfig as admin.ServiceAccount);
  }

  // 2. Fallback to Service Account JSON file (Best for Local Development)
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account.json';
  const possiblePaths = [
    resolve(process.cwd(), serviceAccountPath),
    resolve(__dirname, '../service-account.json'),
    resolve(__dirname, '../../service-account.json')
  ];

  for (const absPath of possiblePaths) {
    if (existsSync(absPath)) {
      console.log(`[FIREBASE-ADMIN] Using service account file at: ${absPath} (Local Mode).`);
      return admin.credential.cert(absPath);
    }
  }

  console.warn('[FIREBASE-ADMIN] WARNING: No Environment Variables found and no service-account.json detected. Using applicationDefault().');
  return admin.credential.applicationDefault();
}


try {
  // Check if already initialized to prevent errors
  if (!admin.apps.length) {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID || 'geo2-626eb'}.appspot.com`;
    
    admin.initializeApp({
      credential: getCredential(),
      projectId: process.env.FIREBASE_PROJECT_ID || 'geo2-626eb',
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: bucketName,
    });
    console.log(`[FIREBASE-ADMIN] Initialized successfully. Storage Bucket: ${bucketName}`);
  }
} catch (error: any) {
  console.error('[FIREBASE-ADMIN] Initialization failed:', error.message);
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export const messaging = admin.messaging();
export { admin };

export default admin;
