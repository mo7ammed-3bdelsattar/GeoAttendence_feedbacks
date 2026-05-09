import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCKhmp5S-YHMdwplWLux_BmNtHwLuuizyo",
  authDomain: "geo2-626eb.firebaseapp.com",
  databaseURL: "https://geo2-626eb-default-rtdb.firebaseio.com",
  projectId: "geo2-626eb",
  storageBucket: "geo2-626eb.firebasestorage.app",
  messagingSenderId: "706599834939",
  appId: "1:706599834939:web:7a3d941e9fe5a36682531e",
  measurementId: "G-9RQB835Y92"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
});
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
export default app;
