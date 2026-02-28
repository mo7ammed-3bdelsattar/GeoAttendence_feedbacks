import axios, { type AxiosInstance } from 'axios';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth as clientAuth } from '../config/firebase';
import type { User, UserRole } from '../types/index.ts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  async login(email: string, password: string, role: UserRole): Promise<User> {
    // 1. Initial login on client via Firebase Auth
    const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
    const firebaseUser = userCredential.user;
    
    // 2. Get ID Token
    const idToken = await firebaseUser.getIdToken();

    // 3. Verify on Express backend & fetch profile
    const response = await api.post('/auth/login', { idToken, role });
    const userData = response.data;

    return {
      id: firebaseUser.uid,
      name: userData.name || firebaseUser.displayName || email.split('@')[0],
      email: firebaseUser.email || email,
      role: userData.role
    };
  },

  async logout(): Promise<void> {
    await signOut(clientAuth);
    // Optional: Call server side logout if sessions are used
  },

  async resetPassword(email: string): Promise<void> {
    // Reset via client-side for better UX/speed, or call backend
    await sendPasswordResetEmail(clientAuth, email);
    await api.post('/auth/reset-password', { email });
  }
};

export const adminApi = {
  async getUsers(role?: UserRole): Promise<User[]> {
    const response = await api.get('/admin/users', { 
      params: { role } 
    });
    return response.data;
  },

  async createUser(payload: Partial<User> & { password?: string }): Promise<User> {
    const response = await api.post('/admin/users', payload);
    return response.data;
  },

  async updateUser(id: string, payload: Partial<User>): Promise<User> {
    const response = await api.patch(`/admin/users/${id}`, payload);
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  }
};

export default api;
