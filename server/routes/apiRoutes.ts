import { Router } from 'express';
import multer from 'multer';
import * as userController from '../controllers/userController';
import * as authController from '../controllers/authController';
import * as enrollmentController from '../controllers/enrollmentController';
import * as departmentController from '../controllers/departmentController';
import * as courseController from '../controllers/courseController';
import * as classroomController from '../controllers/classroomController';
import * as sessionController from '../controllers/sessionController';
import * as feedbackController from '../controllers/feedbackController';
import * as attendanceController from '../controllers/attendanceController';
import * as notificationController from '../controllers/notificationController';
import { getMySchedule, getStudentCourses, getStudentDashboard, studentScheduleController } from '../controllers/studentController';
import { requireAuth, requireStudentAuth } from '../middleware/authGuard';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png']);
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Only jpg and png images are allowed.'));
    }
    return cb(null, true);
  },
});

// Auth routes
router.post('/auth/login', authController.login);
router.post('/auth/reset-password', authController.resetPassword);

// User/Admin routes
router.get('/admin/users', userController.getUsers);
router.post('/admin/users', userController.createUser);
router.patch('/admin/users/:id', userController.updateUser);
router.delete('/admin/users/:id', userController.deleteUser);
router.get('/profile', requireAuth, userController.getProfile);
router.put('/profile', requireAuth, userController.updateProfile);
router.post('/upload-profile-image', requireAuth, upload.single('image'), userController.uploadProfileImage);
router.get('/users/me', requireAuth, userController.getCurrentUser);
router.post('/users/me/avatar', requireAuth, upload.single('image'), userController.uploadMyAvatar);

// Department routes
router.get('/admin/departments', departmentController.getDepartments);
router.post('/admin/departments', departmentController.createDepartment);
router.patch('/admin/departments/:id', departmentController.updateDepartment);
router.delete('/admin/departments/:id', departmentController.deleteDepartment);

// Enrollment routes
router.get('/student/my-courses', enrollmentController.getMyCourses);
router.get('/enrollments', enrollmentController.getEnrollments);
router.get('/enrollments/student/:id', enrollmentController.getEnrollmentsByStudent);
router.post('/enrollments', enrollmentController.enrollStudent);
router.patch('/enrollments/:id', enrollmentController.updateEnrollment);
router.delete('/enrollments/:id', enrollmentController.unenrollStudent);

// Course routes
router.get('/courses', courseController.getCourses);
router.get('/admin/courses', courseController.getCourses);
router.post('/admin/courses', courseController.createCourse);
router.patch('/admin/courses/:id', courseController.updateCourse);
router.delete('/admin/courses/:id', courseController.deleteCourse);

// Classroom routes
router.get('/admin/classrooms', classroomController.getClassrooms);
router.post('/admin/classrooms', classroomController.createClassroom);
router.patch('/admin/classrooms/:id', classroomController.updateClassroom);
router.delete('/admin/classrooms/:id', classroomController.deleteClassroom);

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
