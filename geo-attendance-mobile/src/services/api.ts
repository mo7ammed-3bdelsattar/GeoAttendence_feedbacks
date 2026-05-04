import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth as clientAuth } from '../config/firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.194:5000/api';

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
  (error) => Promise.reject(error)
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

export const authApi = {
  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    try {
      // 1. Try Firebase Authentication first
      console.log('[AUTH] Attempting Firebase login...');
      const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      console.log('[AUTH] Firebase success, syncing with backend...');
      const response = await api.post('/auth/login', { token: idToken, email });
      const userData = response.data;
  
      return {
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role
        },
        token: userData.token || idToken
      };
    } catch (error: any) {
      // 2. Fallback to Backend Authentication (for admin/mock accounts)
      console.log('[AUTH] Firebase failed, trying backend fallback...', error.message);
      try {
        const response = await api.post('/auth/login', { email, password });
        const userData = response.data;
        return {
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role
          },
          token: userData.token
        };
      } catch (fallbackError: any) {
        throw new Error(normalizeApiError(fallbackError, normalizeApiError(error, 'Authentication failed.')));
      }
    }
  },

  async logout(): Promise<void> {
    try {
      await firebaseSignOut(clientAuth);
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async resetPassword(email: string): Promise<void> {
    try {
      await api.post('/auth/reset-password', { email });
    } catch (error) {
      throw new Error(normalizeApiError(error, 'Failed to request password reset.'));
    }
  }
};

export const adminApi = {
  getUsers: async (role?: string) => {
    const response = await api.get('/admin/users', { params: { role } });
    return response.data;
  },

  createUser: async (userData: any) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },

  updateUser: async (id: string, userData: any) => {
    const response = await api.patch(`/admin/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: string) => {
    await api.delete(`/admin/users/${id}`);
  },

  getDepartments: async () => {
    const response = await api.get('/admin/departments');
    return response.data;
  },

  createDepartment: async (payload: any) => {
    const response = await api.post('/admin/departments', payload);
    return response.data;
  },

  updateDepartment: async (id: string, payload: any) => {
    const response = await api.patch(`/admin/departments/${id}`, payload);
    return response.data;
  },

  deleteDepartment: async (id: string) => {
    await api.delete(`/admin/departments/${id}`);
  },

  getCourses: async () => {
    const response = await api.get('/admin/courses');
    return response.data;
  },

  createCourse: async (courseData: any) => {
    const response = await api.post('/admin/courses', courseData);
    return response.data;
  },

  updateCourse: async (id: string, courseData: any) => {
    const response = await api.patch(`/admin/courses/${id}`, courseData);
    return response.data;
  },

  deleteCourse: async (id: string) => {
    await api.delete(`/admin/courses/${id}`);
  },

  getClassrooms: async () => {
    const response = await api.get('/admin/classrooms');
    return response.data;
  },

  createClassroom: async (classroomData: any) => {
    const response = await api.post('/admin/classrooms', classroomData);
    return response.data;
  },

  updateClassroom: async (id: string, classroomData: any) => {
    const response = await api.patch(`/admin/classrooms/${id}`, classroomData);
    return response.data;
  },

  deleteClassroom: async (id: string) => {
    await api.delete(`/admin/classrooms/${id}`);
  },
};

export const enrollmentApi = {
  getEnrollments: async (params: { studentId?: string; courseId?: string } = {}) => {
    const response = await api.get('/enrollments', { params });
    return response.data;
  },

  enrollStudent: async (studentId: string, courseId: string) => {
    const response = await api.post('/enrollments', { studentId, courseId });
    return response.data;
  },

  getStudentEnrollments: async (studentId: string) => {
    const response = await api.get(`/enrollments/student/${studentId}`);
    return response.data;
  },

  updateEnrollment: async (id: string, payload: any) => {
    const response = await api.patch(`/enrollments/${id}`, payload);
    return response.data;
  },

  unenrollStudent: async (id: string) => {
    await api.delete(`/enrollments/${id}`);
  }
};

export const sessionApi = {
  getSessions: async (params: { courseId?: string; facultyId?: string } = {}) => {
    const response = await api.get('/sessions', { params });
    return response.data;
  },

  getSessionsForFaculty: async (facultyId: string) => {
    const response = await api.get(`/sessions/faculty/${facultyId}`);
    return response.data;
  },

  startSession: async (courseId: string, classroomId: string) => {
    const response = await api.post('/sessions/start', { courseId, roomId: classroomId });
    return response.data;
  },

  startSessionById: async (sessionId: string) => {
    const response = await api.post('/sessions/start', { sessionId });
    return response.data;
  },

  endSession: async (sessionId: string) => {
    const response = await api.post('/sessions/end', { sessionId });
    return response.data;
  },

  getSessionQr: async (sessionId: string) => {
    const response = await api.get(`/sessions/${sessionId}/qr`);
    return response.data;
  },

  getSessionSummary: async (sessionId: string) => {
    const response = await api.get(`/sessions/${sessionId}/summary`);
    return response.data;
  },

  updateSession: async (id: string, payload: any) => {
    const response = await api.put(`/sessions/${id}`, payload);
    return response.data;
  },

  deleteSession: async (id: string) => {
    await api.delete(`/sessions/${id}`);
  },

  getStudentSessions: async (studentId: string) => {
    const response = await api.get(`/sessions/student/${studentId}`);
    return response.data;
  },
};

export const attendanceApi = {
  markAttendance: async (payload: {
    studentId: string;
    sessionId: string;
    latitude: number;
    longitude: number;
  }) => {
    const response = await api.post('/attendance', payload);
    return response.data;
  },

  studentCheckin: async (payload: { qrToken: string; gpsCoords: { lat: number; lng: number } }) => {
    try {
      const response = await api.post('/sessions/checkin', payload);
      return response.data;
    } catch (error) {
      throw new Error(normalizeApiError(error, 'Unable to check in.'));
    }
  },

  studentCheckout: async (payload: { qrToken: string; gpsCoords: { lat: number; lng: number } }) => {
    try {
      const response = await api.post('/sessions/checkout', payload);
      return response.data;
    } catch (error) {
      throw new Error(normalizeApiError(error, 'Unable to check out.'));
    }
  },

  locationCheckin: async (payload: { sessionId: string; gpsCoords: { lat: number; lng: number } }) => {
    try {
      const response = await api.post('/sessions/checkin-location', payload);
      return response.data;
    } catch (error) {
      throw new Error(normalizeApiError(error, 'Unable to check in via location.'));
    }
  },

  locationCheckout: async (payload: { sessionId: string; gpsCoords: { lat: number; lng: number } }) => {
    try {
      const response = await api.post('/sessions/checkout-location', payload);
      return response.data;
    } catch (error) {
      throw new Error(normalizeApiError(error, 'Unable to check out via location.'));
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

  getSessionAttendance: async (sessionId: string) => {
    const response = await api.get(`/attendance/session/${sessionId}`);
    return response.data;
  },

  getFacultyAttendanceSummary: async (facultyId: string) => {
    const response = await api.get(`/attendance/faculty/${facultyId}`);
    return response.data;
  }
};

export const feedbackApi = {
  submitFeedback: async (payload: {
    studentId: string;
    courseId: string;
    rating: number;
    message?: string;
  }) => {
    const response = await api.post('/feedback', payload);
    return response.data;
  },

  getAllFeedback: async () => {
    const response = await api.get('/feedback');
    return response.data;
  },

  getFeedbackByCourse: async (courseId: string) => {
    const response = await api.get(`/feedback/course/${courseId}`);
    return response.data;
  },

  getFeedbackByFaculty: async (facultyId: string) => {
    const response = await api.get(`/feedback/faculty/${facultyId}`);
    return response.data;
  },

  getFeedbackByStudent: async (studentId: string) => {
    const response = await api.get(`/feedback/student/${studentId}`);
    return response.data;
  }
};

export const userApi = {
  updatePushToken: async (userId: string, pushToken: string) => {
    const response = await api.patch(`/users/${userId}/push-token`, { pushToken });
    return response.data;
  },
};

export const studentApi = {
  getStudentSessions: async (studentId: string) => {
    const response = await api.get(`/sessions/student/${studentId}`);
    return response.data;
  },
  getStudentCourses: async (studentId: string) => {
    const response = await api.get(`/student/courses/${studentId}`);
    return response.data;
  },
  getStudentDashboard: async (studentId: string) => {
    const response = await api.get(`/student/dashboard/${studentId}`);
    return response.data;
  }
};

export const chatbotApi = {
  ask: async (query: string) => {
    const response = await api.post('/chatbot/ask', { query });
    return response.data.data;
  }
};

export const chatApi = {
  getMyChats: async (userId: string, role: string) => {
    const response = await api.get('/chats', { params: { userId, role } });
    return response.data.data;
  },
  getMessages: async (chatId: string) => {
    const response = await api.get(`/chats/${chatId}/messages`);
    return response.data.data;
  },
  sendMessage: async (payload: { studentId: string; senderId: string; text: string; isAdmin?: boolean }) => {
    const response = await api.post('/chats/messages', payload);
    return response.data.data;
  }
};

export default api;