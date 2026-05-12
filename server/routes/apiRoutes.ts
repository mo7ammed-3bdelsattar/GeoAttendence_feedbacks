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
import * as chatbotController from '../controllers/chatbotController';
import * as chatController from '../controllers/chatController';
import * as groupController from '../controllers/groupController';
import * as reportController from '../controllers/reportController';
import * as bookController from '../controllers/bookController';
import * as uploadController from '../controllers/uploadController';
import { getMySchedule, getStudentCourses, getStudentDashboard, studentScheduleController } from '../controllers/studentController';
import { requireStudentAuth } from '../middleware/authGuard';
import { requireRole } from '../middleware/requireRole';
import { db } from '../config/firebase-admin';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const USE_MOCK_AUTH = process.env.USE_MOCK_AUTH === 'true';

// Multer config for local file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Use absolute path relative to this file
    const uploadPath = path.join(__dirname, '..', 'uploads', 'avatars');
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split('.').pop();
    cb(null, `avatar-${uniqueSuffix}.${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

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
  if (req.body?.token) {
    return authController.login(req, res);
  }
  return USE_MOCK_AUTH ? loginMock(req, res) : authController.login(req, res);
});
router.post('/auth/reset-password', authController.resetPassword);

// User routes
router.get('/users/me', requireRole(['admin', 'faculty', 'student']), userController.getMe);
router.patch('/users/me', requireRole(['admin', 'faculty', 'student']), userController.updateMe);
router.post('/users/upload-avatar', requireRole(['admin', 'faculty', 'student']), upload.single('avatar'), uploadController.uploadImage);

router.post('/ai/chat', requireRole(['admin', 'faculty', 'student']), chatbotController.askChatbot);

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

// Book routes
router.get('/books', bookController.getBooks);
router.post('/admin/books', requireRole('admin'), bookController.createBook);
router.patch('/admin/books/:id', requireRole('admin'), bookController.updateBook);
router.delete('/admin/books/:id', requireRole('admin'), bookController.deleteBook);

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
router.get('/sessions/:sessionId/qr', sessionController.getSessionQr);
router.get('/sessions/:sessionId/summary', sessionController.getSessionSummary);

// New Attendance/Check-in routes for Mobile
router.post('/sessions/checkin', requireRole(['student']), sessionController.checkInWithQr);
router.post('/sessions/checkout', requireRole(['student']), sessionController.checkOutWithQr);
router.post('/sessions/checkin-location', requireRole(['student']), sessionController.checkInWithLocation);
router.post('/sessions/checkout-location', requireRole(['student']), sessionController.checkOutWithLocation);

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

// Chatbot routes
router.post('/chatbot/ask', requireRole(['admin', 'faculty', 'student']), chatbotController.askChatbot);
router.get('/admin/policies', requireRole('admin'), chatbotController.getPolicies);
router.post('/admin/policies', requireRole('admin'), chatbotController.upsertPolicy);
router.delete('/admin/policies/:id', requireRole('admin'), chatbotController.deletePolicy);

// Chat routes
router.get('/chats', chatController.getMyChats);
router.get('/chats/:chatId/messages', chatController.getMessages);
router.post('/chats/messages', chatController.sendMessage);

// Group routes
router.get('/groups', groupController.getGroups);
router.post('/admin/groups', requireRole('admin'), groupController.createGroup);
router.patch('/admin/groups/:id', requireRole('admin'), groupController.updateGroup);
router.delete('/admin/groups/:id', requireRole('admin'), groupController.deleteGroup);

// Report routes
router.get('/reports/instructor/:facultyId', requireRole(['admin', 'faculty']), reportController.getInstructorReport);
router.get('/reports/admin', requireRole('admin'), reportController.getAdminReport);
router.get('/reports/admin/attendance', requireRole('admin'), reportController.getAdminAttendanceReport);

export default router;
