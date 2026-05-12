import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore - TypeScript falsely flags getReactNativePersistence as missing in some Firebase v10 setups
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Log presence of config for debugging (don't log the values)
console.log('[FIREBASE] Initializing with config keys:', Object.keys(firebaseConfig).filter(k => !!(firebaseConfig as any)[k]));

let app;
if (getApps().length === 0) {
  if (!firebaseConfig.apiKey) {
    console.error('[FIREBASE] Critical Error: apiKey is missing. The app will likely crash or fail to function.');
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let auth;
try {
  auth = getAuth(app);
} catch (e) {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };
export const db = getFirestore(app);
export default app;
