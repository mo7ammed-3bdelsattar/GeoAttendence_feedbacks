import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export type UserRole = 'admin' | 'instructor' | 'student';

export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  name: string;
  role: UserRole;
}

const normalizeBackendRole = (role?: string): UserRole => {
  if (!role) return 'student';
  if (role === 'faculty' || role === 'instructor') return 'instructor';
  if (role === 'admin') return 'admin';
  return 'student';
};

interface AuthContextValue {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          // 1. Try to recover user data from storage immediately for better UX
          const storedUser = await AsyncStorage.getItem('userData');
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch (e) {
              console.warn('[AUTH] Corrupt storage cleared');
              await AsyncStorage.removeItem('userData');
            }
          }

          // 2. Fetch fresh data from Firestore
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const role = normalizeBackendRole(String(data.role));
            const appUser: AppUser = {
              id: fbUser.uid,
              uid: fbUser.uid,
              email: fbUser.email,
              name: data.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              role,
            };
            setUser(appUser);
            await AsyncStorage.setItem('userData', JSON.stringify(appUser));
          } else {
            // Fallback: If user doc is not in firestore, use the pending role or stored role
            const currentRole = pendingRole || (JSON.parse(storedUser || '{}') as AppUser).role || 'student';
            const fallbackUser: AppUser = {
              id: fbUser.uid,
              uid: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              role: currentRole as any,
            };
            setUser(fallbackUser);
          }
          const idToken = await fbUser.getIdToken();
          await AsyncStorage.setItem('userToken', idToken);
        } catch (error) {
          console.error('[AUTH] refresh failed:', error);
        }
      } else {
        setUser(null);
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [pendingRole]);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim();
    
    try {
      // 1. Try Backend Login FIRST (Matching Web App logic)
      const { authApi } = require('../services/api');
      const loginData = await authApi.login(normalizedEmail, password);
      const { user: backendUser, token: backendToken } = loginData;
      
      const appUser: AppUser = {
        id: backendUser.id,
        uid: backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        role: normalizeBackendRole(backendUser.role),
      };
      
      setUser(appUser);
      if (backendToken) {
        await AsyncStorage.setItem('userToken', backendToken);
        await AsyncStorage.setItem('userData', JSON.stringify(appUser));
      }
    } catch (backendErr: any) {
      // 2. Fallback to Firebase Auth ONLY if backend login fails
      try {
        const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        
        const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
        if (userDoc.exists()) {
          const actualRole = normalizeBackendRole(String(userDoc.data()?.role));
          const appUser: AppUser = {
            id: credential.user.uid,
            uid: credential.user.uid,
            email: credential.user.email,
            name: userDoc.data()?.name || credential.user.displayName || 'User',
            role: actualRole,
          };
          setUser(appUser);
          await AsyncStorage.setItem('userData', JSON.stringify(appUser));
        }
        
        const idToken = await credential.user.getIdToken();
        await AsyncStorage.setItem('userToken', idToken);
      } catch (firebaseErr: any) {
        throw backendErr;
      }
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, login: login as any, logout, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
