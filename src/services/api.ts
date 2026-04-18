import axios, { type AxiosInstance } from 'axios';
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth as clientAuth } from '../config/firebase';
import { getAccessToken } from '../utils/storage.ts';
import type { Attendance, Classroom, Course, Department, Enrollment, Session, User, UserRole } from '../types/index.ts';
import type { Feedback } from '../types/feedback.ts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getApiMessage = (error: any, fallback: string) => {
  return error?.response?.data?.message || error?.response?.data?.error || fallback;
};

export const authApi = {
  async login(email: string, password: string, role: UserRole): Promise<{ user: User; token: string }> {
    try {
      const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
      const token = await userCredential.user.getIdToken();
      
      const response = await api.post('/auth/login', { token, role, email });
      const userData = response.data;
  
      return {
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role
        },
        token: userData.token || token
      };
    } catch (error: any) {
      try {
        const response = await api.post('/auth/login', { email, password, role });
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
        throw new Error(getApiMessage(fallbackError, getApiMessage(error, 'Authentication failed.')));
      }
    }
  },

  async logout(): Promise<void> {
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

  async getOpenCourses(): Promise<Course[]> {
    const response = await api.get('/courses', { params: { open: true } });
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

  async getOpenCourses(): Promise<Course[]> {
    const response = await api.get('/admin/courses');
    return response.data;
  },
};

export const enrollmentApi = {
  async getEnrollments(params: { studentId?: string; courseId?: string } = {}): Promise<Enrollment[]> {
    const response = await api.get('/enrollments', { params });
    return response.data;
  },

  async enrollStudent(studentId: string, courseId: string, _courseName?: string): Promise<Enrollment> {
    const response = await api.post('/enrollments', { studentId, courseId });
    return response.data;
  },

  async getStudentEnrollments(studentId: string): Promise<Enrollment[]> {
    const response = await api.get(`/enrollments/student/${studentId}`);
    return response.data;
  },

  async updateEnrollment(id: string, payload: Partial<Enrollment>): Promise<Enrollment> {
    const response = await api.patch(`/enrollments/${id}`, payload);
    return response.data;
  },

  async unenrollStudent(id: string): Promise<void> {
    await api.delete(`/enrollments/${id}`);
  },

  async unenrollMyCourse(courseId: string): Promise<void> {
    await api.delete(`/enrollments/${courseId}`);
  }
};

export const sessionApi = {
  async createSession(payload: Partial<Session>): Promise<Session> {
    const response = await api.post('/sessions', payload);
    return response.data;
  },

  async getSessions(params: { courseId?: string; facultyId?: string } = {}): Promise<Session[]> {
    const response = await api.get('/sessions', { params });
    return response.data;
  },

  async getSessionsForFaculty(facultyId: string): Promise<Session[]> {
    const response = await api.get(`/sessions/faculty/${facultyId}`);
    return response.data;
  },

  async getSessionQr(sessionId: string): Promise<{ token: string; expiresAt: string }> {
    const response = await api.get(`/sessions/${sessionId}/qr`);
    return response.data;
  },

  async getSessionSummary(sessionId: string): Promise<any> {
    const response = await api.get(`/sessions/${sessionId}/summary`);
    return response.data;
  },

  async updateSession(id: string, payload: Partial<Session>): Promise<Session> {
    const response = await api.put(`/sessions/${id}`, payload);
    return response.data;
  },

  async deleteSession(id: string): Promise<void> {
    await api.delete(`/sessions/${id}`);
  },

  async getStudentSessions(studentId: string): Promise<Session[]> {
    const response = await api.get(`/sessions/student/${studentId}`);
    return response.data;
  },

  async saveStudentCourses(studentId: string, courseIds: string[]): Promise<void> {
    await api.post('/student/courses', { studentId, courseIds });
  },

  async startSession(id: string): Promise<{ id: string; status: string; startedAt: string }> {
    const response = await api.post(`/sessions/${id}/start`);
    return response.data;
  },

  async endSession(id: string): Promise<{ id: string; status: string; endedAt: string }> {
    const response = await api.post(`/sessions/${id}/end`);
    return response.data;
  }
};

export const notificationApi = {
  async getMyNotifications(): Promise<Array<{
    id: string;
    type: string;
    courseId: string;
    sessionId: string;
    title: string;
    message: string;
    createdAt: string;
  }>> {
    const response = await api.get('/notifications/my');
    return response.data;
  }
};

export const attendanceApi = {
  async markAttendance(payload: {
    studentId: string;
    sessionId: string;
    latitude: number;
    longitude: number;
  }): Promise<Attendance> {
    const response = await api.post('/attendance', payload);
    return response.data;
  },

  async studentCheckin(payload: {
    qrToken: string;
    gpsCoords: { lat: number; lng: number };
  }): Promise<any> {
    const response = await api.post('/sessions/checkin', payload);
    return response.data;
  },

  async studentCheckout(payload: { qrToken: string; gpsCoords: { lat: number; lng: number } }): Promise<any> {
    const response = await api.post('/sessions/checkout', payload);
    return response.data;
  },

  async markAttendanceSmart(payload: {
    studentId: string;
    sessionId: string;
    latitude: number;
    longitude: number;
    qrToken?: string;
  }): Promise<any> {
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

  async getSessionAttendance(sessionId: string): Promise<{
    sessionId: string;
    presentCount: number;
    absentCount: number;
    records: Attendance[];
  }> {
    const response = await api.get(`/attendance/session/${sessionId}`);
    return response.data;
  },

  async getFacultyAttendanceSummary(facultyId: string): Promise<
    Array<{ sessionId: string; presentCount: number; absentCount: number }>
  > {
    const response = await api.get(`/attendance/faculty/${facultyId}`);
    return response.data;
  }
};

export const feedbackApi = {
  async submitFeedback(payload: {
    studentId: string;
    courseId: string;
    rating: number;
    message?: string;
  }): Promise<Feedback> {
    const response = await api.post('/feedback', payload);
    return response.data;
  },

  async getAllFeedback(): Promise<Feedback[]> {
    const response = await api.get('/feedback');
    return response.data;
  },

  async getFeedbackByCourse(courseId: string): Promise<Feedback[]> {
    const response = await api.get(`/feedback/course/${courseId}`);
    return response.data;
  },

  async getFeedbackByFaculty(facultyId: string): Promise<{
    courses: Array<{
      courseId: string;
      courseName: string;
      courseCode: string;
      averageRating: number;
      feedbackCount: number;
      feedback: Array<{
        id: string;
        rating: number;
        message?: string;
        createdAt?: string | null;
      }>;
    }>;
    summary: {
      totalFeedbacks: number;
      overallAverage: number;
    };
  }> {
    const response = await api.get(`/feedback/faculty/${facultyId}`);
    return response.data;
  },

  async getFeedbackByStudent(studentId: string): Promise<Feedback[]> {
    const response = await api.get(`/feedback/student/${studentId}`);
    return response.data;
  },

  async deleteFeedback(id: string): Promise<void> {
    await api.delete(`/feedback/${id}`);
  }
};

export const studentApi = {
  async getStudentCourses(studentId: string): Promise<Course[]> {
    const response = await api.get(`/student/courses/${studentId}`);
    return response.data;
  },

  async getStudentSessions(studentId: string): Promise<Session[]> {
    const response = await api.get(`/sessions/student/${studentId}`);
    return response.data;
  },

  async getStudentDashboard(studentId: string): Promise<{
    courses: Course[];
    sessions: Session[];
    feedbackCount: number;
  }> {
    const response = await api.get(`/student/dashboard/${studentId}`);
    return response.data;
  },

  async getMySchedule(): Promise<Array<{
    courseId: string;
    courseName: string;
    instructorName: string;
    day: string;
    time: string;
  }>> {
    const response = await api.get('/student/my-schedule');
    return response.data;
  },

  async getMyCourses(): Promise<Array<{
    courseId: string;
    courseName: string;
    instructorName: string;
    day: string;
    time: string;
  }>> {
    const response = await api.get('/student/my-courses');
    return response.data;
  }
};

export default api;
