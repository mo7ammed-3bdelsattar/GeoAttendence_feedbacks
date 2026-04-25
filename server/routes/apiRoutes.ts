import { Router, Request, Response } from 'express';
import * as userController from '../controllers/userController';
import * as authController from '../controllers/authController';
import { loginMock } from '../controllers/authControllerMock';
import * as enrollmentController from '../controllers/enrollmentController';
import * as departmentController from '../controllers/departmentController';
import * as courseController from '../controllers/courseController';
import * as classroomController from '../controllers/classroomController';
import * as sessionController from '../controllers/sessionController';
import * as feedbackController from '../controllers/feedbackController';
import * as attendanceController from '../controllers/attendanceController';
import * as notificationController from '../controllers/notificationController';
import { getMySchedule, getStudentCourses, getStudentDashboard, studentScheduleController } from '../controllers/studentController';
import { requireStudentAuth } from '../middleware/authGuard';
import { requireRole } from '../middleware/requireRole';
import { db } from '../config/firebase-admin';

const router = Router();
const USE_MOCK_AUTH = process.env.USE_MOCK_AUTH === 'true';

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API Gateway is running' });
});

// Firestore connection test
router.get('/admin/health/firestore', async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('_health_check').limit(1).get();
    res.json({ status: 'connected', message: 'Firestore is accessible' });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'disconnected', 
      error: error.message,
      code: error.code 
    });
  }
});

// Auth routes
router.post('/auth/login', (req, res) => {
  // Keep mock email/password login support, but always use real controller for Firebase token logins.
  if (req.body?.token) {
    return authController.login(req, res);
  }
  return USE_MOCK_AUTH ? loginMock(req, res) : authController.login(req, res);
});
router.post('/auth/reset-password', authController.resetPassword);

// User/Admin routes
router.get('/admin/users', requireRole('admin'), userController.getUsers);
router.post('/admin/users', requireRole('admin'), userController.createUser);
router.patch('/admin/users/:id', requireRole('admin'), userController.updateUser);
router.delete('/admin/users/:id', requireRole('admin'), userController.deleteUser);
router.patch('/users/:id/push-token', userController.updatePushToken);
router.post('/admin/test-notifications', requireRole('admin'), userController.testNotifications);


// Department routes
router.get('/admin/departments', requireRole('admin'), departmentController.getDepartments);
router.post('/admin/departments', requireRole('admin'), departmentController.createDepartment);
router.patch('/admin/departments/:id', requireRole('admin'), departmentController.updateDepartment);
router.delete('/admin/departments/:id', requireRole('admin'), departmentController.deleteDepartment);

// Course routes
router.get('/admin/courses', requireRole(['admin', 'faculty', 'student']), courseController.getCourses);
router.post('/admin/courses', requireRole('admin'), courseController.createCourse);
router.patch('/admin/courses/:id', requireRole('admin'), courseController.updateCourse);
router.delete('/admin/courses/:id', requireRole('admin'), courseController.deleteCourse);

// Classroom routes
router.get('/admin/classrooms', requireRole(['admin', 'faculty']), classroomController.getClassrooms);
router.post('/admin/classrooms', requireRole('admin'), classroomController.createClassroom);
router.patch('/admin/classrooms/:id', requireRole('admin'), classroomController.updateClassroom);
router.delete('/admin/classrooms/:id', requireRole('admin'), classroomController.deleteClassroom);

// Enrollment routes
router.get('/student/my-courses', enrollmentController.getMyCourses);
router.get('/enrollments', enrollmentController.getEnrollments);
router.get('/enrollments/student/:id', enrollmentController.getEnrollmentsByStudent);
router.post('/enrollments', enrollmentController.enrollStudent);
router.patch('/enrollments/:id', enrollmentController.updateEnrollment);
router.delete('/enrollments/:id', enrollmentController.unenrollStudent);

// Session routes
router.post('/sessions', sessionController.createSession);
router.get('/sessions', sessionController.getSessions);
router.get('/sessions/faculty/:id', sessionController.getSessionsByFaculty);
router.get('/sessions/student/:id', sessionController.getSessionsByStudent);
router.put('/sessions/:id', sessionController.updateSession);
router.delete('/sessions/:id', sessionController.deleteSession);
router.post('/sessions/:id/start', sessionController.startSessionById);
router.post('/sessions/:id/end', sessionController.endSessionById);

// Attendance routes
router.post('/attendance', attendanceController.markAttendance);
router.get('/attendance/session/:sessionId', attendanceController.getAttendanceBySession);
router.get('/attendance/faculty/:facultyId', attendanceController.getAttendanceByFaculty);

// Feedback routes
router.post('/feedback', feedbackController.submitFeedback);
router.get('/feedback', feedbackController.getAllFeedback);
router.get('/feedback/course/:courseId', feedbackController.getFeedbackByCourse);
router.get('/feedback/faculty/:facultyId', feedbackController.getFeedbackByFaculty);
router.get('/feedback/student/:id', feedbackController.getFeedbackByStudent);
router.delete('/feedback/:id', feedbackController.deleteFeedbackById);
router.get('/notifications/my', notificationController.getMyNotifications);

// Student schedule routes
router.get('/student/my-schedule', requireStudentAuth, getMySchedule);
router.get('/student/schedule', studentScheduleController.getSchedule);
router.post('/student/courses', studentScheduleController.saveCourses);
router.get('/student/courses/:studentId', getStudentCourses);
router.get('/student/dashboard/:studentId', getStudentDashboard);

export default router;
