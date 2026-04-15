// services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// تكوين الـ API
const API_URL = 'http://your-server-ip:3000/api'; // غير هذا الرابط حسب عنوان السيرفر الخاص بك

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// إضافة الـ token تلقائياً لكل request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// تعريف الـ Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  createdAt?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  facultyId?: string;
  facultyName?: string;
}

// دوال الـ API
export const adminApi = {
  // ==================== Users APIs ====================
  getUsers: async (role?: string) => {
    try {
      const url = role ? `/admin/users?role=${role}` : '/admin/users';
      const response = await api.get(url);
      console.log('Get users response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  },

  createUser: async (userData: { name: string; email: string; role: string; password: string }) => {
    try {
      console.log('Creating user with data:', { ...userData, password: '***' });
      const response = await api.post('/admin/users', userData);
      console.log('Create user response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  },

  updateUser: async (id: string, userData: any) => {
    try {
      console.log(`Updating user ${id} with data:`, { ...userData, password: userData.password ? '***' : undefined });
      const response = await api.put(`/admin/users/${id}`, userData);
      console.log('Update user response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  deleteUser: async (id: string) => {
    try {
      console.log(`Deleting user ${id}`);
      const response = await api.delete(`/admin/users/${id}`);
      console.log('Delete user response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  },

  // ==================== Courses APIs ====================
  getCourses: async () => {
    try {
      const response = await api.get('/admin/courses');
      console.log('Get courses response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get courses error:', error);
      throw error;
    }
  },

  createCourse: async (courseData: any) => {
    try {
      console.log('Creating course with data:', courseData);
      const response = await api.post('/admin/courses', courseData);
      console.log('Create course response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create course error:', error);
      throw error;
    }
  },

  updateCourse: async (id: string, courseData: any) => {
    try {
      console.log(`Updating course ${id} with data:`, courseData);
      const response = await api.put(`/admin/courses/${id}`, courseData);
      console.log('Update course response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Update course error:', error);
      throw error;
    }
  },

  deleteCourse: async (id: string) => {
    try {
      console.log(`Deleting course ${id}`);
      const response = await api.delete(`/admin/courses/${id}`);
      console.log('Delete course response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Delete course error:', error);
      throw error;
    }
  },
};

export default api;