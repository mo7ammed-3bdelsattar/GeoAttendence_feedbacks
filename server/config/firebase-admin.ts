import admin from 'firebase-admin';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

config();

function getCredential() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account.json';
  
  // Try multiple possible locations for the service account file
  const possiblePaths = [
    resolve(process.cwd(), serviceAccountPath),
    resolve(process.cwd(), 'src/assets/service-account.json'),
    resolve(__dirname, '../../src/assets/service-account.json'),
    resolve(__dirname, '../service-account.json')
  ];

  for (const absPath of possiblePaths) {
    if (existsSync(absPath)) {
      console.log(`[FIREBASE-ADMIN] Using service account file at: ${absPath}`);
      return admin.credential.cert(absPath);
    }
  }

  const inlineConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (inlineConfig.projectId && inlineConfig.clientEmail && inlineConfig.privateKey) {
    console.log('[FIREBASE-ADMIN] Using individual environment variables.');
    return admin.credential.cert(inlineConfig as admin.ServiceAccount);
  }

  console.warn('[FIREBASE-ADMIN] WARNING: No service_account.json found and env variables incomplete. Falling back to applicationDefault().');
  return admin.credential.applicationDefault();
}

try {
  // Check if already initialized to prevent errors
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: getCredential(),
      projectId: process.env.FIREBASE_PROJECT_ID || 'geo-attendance-6e1a4',
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    console.log('[FIREBASE-ADMIN] Initialized successfully.');
  }
} catch (error: any) {
  console.error('[FIREBASE-ADMIN] Initialization failed:', error.message);
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export { admin };

export default admin;
