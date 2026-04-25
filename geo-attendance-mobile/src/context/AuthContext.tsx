import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { authApi } from '../services/api';

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
  if (role === 'faculty' || role === 'instructor' || role === 'doctor') return 'instructor';
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

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.warn('[AUTH] Unable to restore user from storage.', error);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim();
    const loginData = await authApi.login(normalizedEmail, password);
    const { user: backendUser, token } = loginData;

    const appUser: AppUser = {
      id: backendUser.id,
      uid: backendUser.id,
      email: backendUser.email,
      name: backendUser.name,
      role: normalizeBackendRole(backendUser.role),
    };

    setUser(appUser);
    if (token) {
      await AsyncStorage.setItem('userToken', token);
    }
    await AsyncStorage.setItem('userData', JSON.stringify(appUser));
  };

  const logout = async () => {
    // Always clear local auth state first so logout is reliable
    // even when Firebase session is not active (e.g. backend/mock login).
    setUser(null);
    setFirebaseUser(null);
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('[AUTH] Firebase signOut skipped/failed:', error);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, login, logout, resetPassword }}
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
