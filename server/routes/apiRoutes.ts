import { Router } from 'express';
import * as userController from '../controllers/userController';
import * as authController from '../controllers/authController';
import * as enrollmentController from '../controllers/enrollmentController';
import * as departmentController from '../controllers/departmentController';
import * as courseController from '../controllers/courseController';
import * as classroomController from '../controllers/classroomController';
import * as sessionController from '../controllers/sessionController';
import * as feedbackController from '../controllers/feedbackController';
import * as attendanceController from '../controllers/attendanceController';
import { getStudentCourses, getStudentDashboard, studentScheduleController } from '../controllers/studentController';

const router = Router();

// Auth routes
router.post('/auth/login', authController.login);
router.post('/auth/reset-password', authController.resetPassword);

// User/Admin routes
router.get('/admin/users', userController.getUsers);
router.post('/admin/users', userController.createUser);
router.patch('/admin/users/:id', userController.updateUser);
router.delete('/admin/users/:id', userController.deleteUser);

// Department routes
router.get('/admin/departments', departmentController.getDepartments);
router.post('/admin/departments', departmentController.createDepartment);
router.patch('/admin/departments/:id', departmentController.updateDepartment);
router.delete('/admin/departments/:id', departmentController.deleteDepartment);

// Enrollment routes
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

// Student schedule routes
router.get('/student/schedule', studentScheduleController.getSchedule);
router.post('/student/courses', studentScheduleController.saveCourses);
router.get('/student/courses/:studentId', getStudentCourses);
router.get('/student/dashboard/:studentId', getStudentDashboard);

export default router;
