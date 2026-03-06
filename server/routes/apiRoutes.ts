import { Router } from 'express';
import * as userController from '../controllers/userController';
import * as authController from '../controllers/authController';
import * as departmentController from '../controllers/departmentController';
import * as classroomController from '../controllers/classroomController';

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
router.patch('/admin/departments/:id', departmentController.updateDepartment);

// Classroom routes
router.get('/admin/classrooms', classroomController.getClassrooms);
router.post('/admin/classrooms', classroomController.createClassroom);
router.patch('/admin/classrooms/:id', classroomController.updateClassroom);
router.delete('/admin/classrooms/:id', classroomController.deleteClassroom);

export default router;
