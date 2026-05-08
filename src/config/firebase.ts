// ─────────────────────────────────────────────────────────────────────────────
// Firebase Configuration
// Replace every value below with your actual project credentials from:
//   Firebase Console → Project Settings → Your apps → SDK setup and configuration
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCKhmp5S-YHMdwplWLux_BmNtHwLuuizyo",
  authDomain: "geo-attendance-6e1a4.firebaseapp.com",
  databaseURL: "https://geo-attendance-6e1a4-default-rtdb.firebaseio.com",
  projectId: "geo-attendance-6e1a4",
  storageBucket: "geo-attendance-6e1a4.firebasestorage.app",
  messagingSenderId: "706599834939",
  appId: "1:706599834939:web:7a3d941e9fe5a36682531e",
  measurementId: "G-9RQB835Y92"
};

// Initialize Firebase app (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth with browser persistence for web
const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
});

const db = getFirestore(app);
const storage = getStorage(app);

// ── Exports ────────────────────────────────────────────────────────────────
export { app, auth, db, storage };
export default app;