import axios, { type AxiosInstance } from 'axios';
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth as clientAuth } from '../config/firebase';
import { getAccessToken, clearAuth } from '../utils/storage.ts';
import type { Classroom, Course, Department, Enrollment, User, UserRole, Session } from '../types/index.ts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach auth token
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authApi = {
  async login(email: string, password: string, role: UserRole): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
      const token = await userCredential.user.getIdToken();
      
      const response = await api.post('/auth/login', { token, role, email });
      const userData = response.data;
  
      return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role
      };
    } catch (error: any) {
      // Fallback for mock users or pure backend auth if Firebase Auth fails
      // or we can remove the fallback if Firebase is strict.
      // We'll just pass it through so the backend can still try mock auth if needed.
      const response = await api.post('/auth/login', { email, password, role });
      const userData = response.data;
      
      return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role
      };
    }
  },

  async logout(): Promise<void> {
    // Mock logout
  },

  async resetPassword(email: string): Promise<void> {
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
  },

  async getDepartments(): Promise<Department[]> {
    const response = await api.get('/admin/departments');
    return response.data;
  },

  async createDepartment(payload: Partial<Department>): Promise<Department> {
    const response = await api.post('/admin/departments', payload);
    return response.data;
  },

  async updateDepartment(id: string, payload: Partial<Department>): Promise<Department> {
    const response = await api.patch(`/admin/departments/${id}`, payload);
    return response.data;
  },

  async deleteDepartment(id: string): Promise<void> {
    await api.delete(`/admin/departments/${id}`);
  },

  async getCourses(): Promise<Course[]> {
    const response = await api.get('/admin/courses');
    return response.data;
  },

  async createCourse(payload: Partial<Course>): Promise<Course> {
    const response = await api.post('/admin/courses', payload);
    return response.data;
  },

  async updateCourse(id: string, payload: Partial<Course>): Promise<Course> {
    const response = await api.patch(`/admin/courses/${id}`, payload);
    return response.data;
  },

  async deleteCourse(id: string): Promise<void> {
    await api.delete(`/admin/courses/${id}`);
  },

  async getClassrooms(): Promise<Classroom[]> {
    const response = await api.get('/admin/classrooms');
    return response.data;
  },

  async createClassroom(payload: Partial<Classroom>): Promise<Classroom> {
    const response = await api.post('/admin/classrooms', payload);
    return response.data;
  },

  async updateClassroom(id: string, payload: Partial<Classroom>): Promise<Classroom> {
    const response = await api.patch(`/admin/classrooms/${id}`, payload);
    return response.data;
  },

  async deleteClassroom(id: string): Promise<void> {
    await api.delete(`/admin/classrooms/${id}`);
  },
};

export const enrollmentApi = {
  async getEnrollments(params: { studentId?: string; courseId?: string } = {}): Promise<Enrollment[]> {
    const response = await api.get('/enrollments', { params });
    return response.data;
  },

  async enrollStudent(studentId: string, courseId: string, courseName: string): Promise<Enrollment> {
    const response = await api.post('/enrollments', { studentId, courseId, courseName });
    return response.data;
  },

  async updateEnrollment(id: string, payload: Partial<Enrollment>): Promise<Enrollment> {
    const response = await api.patch(`/enrollments/${id}`, payload);
    return response.data;
  },

  async unenrollStudent(id: string): Promise<void> {
    await api.delete(`/enrollments/${id}`);
  }
};

export const sessionApi = {
  async getSessions(params: { courseId?: string; facultyId?: string } = {}): Promise<Session[]> {
    const response = await api.get('/sessions', { params });
    return response.data;
  },

  async createSession(payload: Partial<Session>): Promise<Session> {
    const response = await api.post('/sessions', payload);
    return response.data;
  },

  async updateSession(id: string, payload: Partial<Session>): Promise<Session> {
    const response = await api.patch(`/sessions/${id}`, payload);
    return response.data;
  },

  async deleteSession(id: string): Promise<void> {
    await api.delete(`/sessions/${id}`);
  },

  async closeSession(id: string): Promise<void> {
    await api.post(`/sessions/${id}/close`);
  },

  async getAttendance(sessionId: string): Promise<any[]> {
    const response = await api.get(`/sessions/${sessionId}/attendance`);
    return response.data;
  }
};

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear authentication on 401
      clearAuth();
      // Optionally redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
