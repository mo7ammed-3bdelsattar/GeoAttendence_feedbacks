
import { initializeApp } from 'firebase/app';
import { getAuth }        from 'firebase/auth';
import { getFirestore }   from 'firebase/firestore';
import { getStorage }     from 'firebase/storage';

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
const app = initializeApp(firebaseConfig);

// ── Exports ────────────────────────────────────────────────────────────────
export const auth    = getAuth(app);       
export const db      = getFirestore(app); 
export const storage = getStorage(app);    

export default app;

