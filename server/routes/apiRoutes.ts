import { Router } from 'express';
import * as userController from '../controllers/userController';
import * as authController from '../controllers/authController';
import * as enrollmentController from '../controllers/enrollmentController';
import * as departmentController from '../controllers/departmentController';
import * as courseController from '../controllers/courseController';
import * as classroomController from '../controllers/classroomController';
import * as sessionController from '../controllers/sessionController';

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
router.post('/enrollments', enrollmentController.enrollStudent);
router.patch('/enrollments/:id', enrollmentController.updateEnrollment);
router.delete('/enrollments/:id', enrollmentController.unenrollStudent);

// Course routes
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
router.get('/sessions', sessionController.getSessions);
router.post('/sessions', sessionController.createSession);
router.patch('/sessions/:id', sessionController.updateSession);
router.delete('/sessions/:id', sessionController.deleteSession);
router.post('/sessions/:id/close', sessionController.closeSession);
router.get('/sessions/:id/attendance', sessionController.getAttendance);

export default router;
