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
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
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
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const role = normalizeBackendRole(String(data.role));
            setUser({
              id: fbUser.uid,
              uid: fbUser.uid,
              email: fbUser.email,
              name: data.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              role,
            });
          } else {
            // Fallback: If user doc is not in firestore, use the pending role from login screen
            setUser({
              id: fbUser.uid,
              uid: fbUser.uid,
              email: fbUser.email,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              role: pendingRole || 'student',
            });
          }
          const idToken = await fbUser.getIdToken();
          await AsyncStorage.setItem('userToken', idToken);
        } catch {
          // Fallback on error
          setUser({
            id: fbUser.uid,
            uid: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            role: pendingRole || 'student',
          });
        }
      } else {
        setUser(null);
        await AsyncStorage.removeItem('userToken');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [pendingRole]);

  const login = async (email: string, password: string, role?: UserRole) => {
    if (role) setPendingRole(role);
    const credential = await signInWithEmailAndPassword(auth, email, password);

    const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
    if (userDoc.exists()) {
      const actualRole = normalizeBackendRole(String(userDoc.data()?.role));
      const selectedRole = role || 'student';
      if (selectedRole !== actualRole) {
        await signOut(auth);
        throw new Error('RoleMismatch');
      }
    }

    const idToken = await credential.user.getIdToken();
    await AsyncStorage.setItem('userToken', idToken);
    // User state is updated automatically via onAuthStateChanged
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
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
