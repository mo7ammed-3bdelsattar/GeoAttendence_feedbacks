import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCKhmp5S-YHMdwplWLux_BmNtHwLuuizyo',
  authDomain: 'geo-attendance-6e1a4.firebaseapp.com',
  databaseURL: 'https://geo-attendance-6e1a4-default-rtdb.firebaseio.com',
  projectId: 'geo-attendance-6e1a4',
  storageBucket: 'geo-attendance-6e1a4.firebasestorage.app',
  messagingSenderId: '706599834939',
  appId: '1:706599834939:web:7a3d941e9fe5a36682531e',
};

// Prevent re-initialization on hot reload
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// getAuth works with Expo's managed workflow; Firebase JS SDK handles persistence
// However, to fix the persistence warning in React Native, we use initializeAuth explicitly
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);

export default app;
