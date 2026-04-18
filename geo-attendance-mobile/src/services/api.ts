import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const normalizeApiError = (error: any, fallback: string) => {
  const code = error?.response?.data?.error;
  const message = error?.response?.data?.message || error?.response?.data?.error;
  if (code === 'role_mismatch' || message === 'Role mismatch.') {
    return 'The selected role does not match the account type. Please choose the correct role.';
  }
  return message || fallback;
};

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

export const adminApi = {
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

  getClassrooms: async () => {
    try {
      const response = await api.get('/admin/classrooms');
      console.log('Get classrooms response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get classrooms error:', error);
      throw error;
    }
  },

  createClassroom: async (classroomData: any) => {
    try {
      console.log('Creating classroom with data:', classroomData);
      const response = await api.post('/admin/classrooms', classroomData);
      console.log('Create classroom response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create classroom error:', error);
      throw error;
    }
  },

  updateClassroom: async (id: string, classroomData: any) => {
    try {
      console.log(`Updating classroom ${id} with data:`, classroomData);
      const response = await api.put(`/admin/classrooms/${id}`, classroomData);
      console.log('Update classroom response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Update classroom error:', error);
      throw error;
    }
  },

  deleteClassroom: async (id: string) => {
    try {
      console.log(`Deleting classroom ${id}`);
      const response = await api.delete(`/admin/classrooms/${id}`);
      console.log('Delete classroom response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Delete classroom error:', error);
      throw error;
    }
  },
};

export const sessionApi = {
  getSessions: async (params: { courseId?: string; facultyId?: string } = {}) => {
    try {
      const response = await api.get('/sessions', { params });
      return response.data;
    } catch (error) {
      console.error('Get sessions error:', error);
      throw error;
    }
  },

  startSession: async (courseId: string, classroomId: string) => {
    try {
      const response = await api.post('/sessions/start', { courseId, roomId: classroomId });
      return response.data;
    } catch (error) {
      console.error('Start session error:', error);
      throw error;
    }
  },

  startSessionById: async (sessionId: string) => {
    try {
      const response = await api.post('/sessions/start', { sessionId });
      return response.data;
    } catch (error) {
      console.error('Start session by ID error:', error);
      throw error;
    }
  },

  endSession: async (sessionId: string) => {
    try {
      const response = await api.post('/sessions/end', { sessionId });
      return response.data;
    } catch (error) {
      console.error('End session error:', error);
      throw error;
    }
  },

  getSessionQr: async (sessionId: string) => {
    try {
      const response = await api.get(`/sessions/${sessionId}/qr`);
      return response.data;
    } catch (error) {
      console.error('Get session QR error:', error);
      throw error;
    }
  },

  getSessionSummary: async (sessionId: string) => {
    try {
      const response = await api.get(`/sessions/${sessionId}/summary`);
      return response.data;
    } catch (error) {
      console.error('Get session summary error:', error);
      throw error;
    }
  },
};

export const attendanceApi = {
  markAttendance: async (payload: {
    studentId: string;
    sessionId: string;
    latitude: number;
    longitude: number;
  }) => {
    try {
      const response = await api.post('/attendance', payload);
      return response.data;
    } catch (error) {
      console.error('Mark attendance error:', error);
      throw error;
    }
  },

  studentCheckin: async (payload: { qrToken: string; gpsCoords: { lat: number; lng: number } }) => {
    try {
      const response = await api.post('/sessions/checkin', payload);
      return response.data;
    } catch (error) {
      console.error('Student checkin error:', error);
      throw new Error(normalizeApiError(error, 'Unable to check in.'));
    }
  },

  studentCheckout: async (payload: { qrToken: string; gpsCoords: { lat: number; lng: number } }) => {
    try {
      const response = await api.post('/sessions/checkout', payload);
      return response.data;
    } catch (error) {
      console.error('Student checkout error:', error);
      throw new Error(normalizeApiError(error, 'Unable to check out.'));
    }
  },

  markAttendanceSmart: async (payload: {
    studentId: string;
    sessionId: string;
    latitude: number;
    longitude: number;
    qrToken?: string;
  }) => {
    if (payload.qrToken) {
      return attendanceApi.studentCheckin({
        qrToken: payload.qrToken,
        gpsCoords: { lat: payload.latitude, lng: payload.longitude },
      });
    }
    return attendanceApi.markAttendance({
      studentId: payload.studentId,
      sessionId: payload.sessionId,
      latitude: payload.latitude,
      longitude: payload.longitude,
    });
  },
};

export const studentApi = {
  getStudentSessions: async (studentId: string) => {
    try {
      const response = await api.get(`/sessions/student/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('Get student sessions error:', error);
      throw error;
    }
  },
  getStudentCourses: async (studentId: string) => {
    try {
      const response = await api.get(`/student/courses/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('Get student courses error:', error);
      throw error;
    }
  }
};

export const feedbackApi = {
  submitFeedback: async (data: { studentId: string; courseId: string; rating: number; message?: string }) => {
    try {
      const response = await api.post('/feedback', data);
      return response.data;
    } catch (error) {
      console.error('Submit feedback error:', error);
      throw error;
    }
  }
};

export default api;