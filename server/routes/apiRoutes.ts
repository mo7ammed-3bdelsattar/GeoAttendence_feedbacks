import { Router } from 'express';
import * as userController from '../controllers/userController';
import * as authController from '../controllers/authController';
import * as enrollmentController from '../controllers/enrollmentController';

const router = Router();

// Auth routes
router.post('/auth/login', authController.login);
router.post('/auth/reset-password', authController.resetPassword);

// User/Admin routes
router.get('/admin/users', userController.getUsers);
router.post('/admin/users', userController.createUser);
router.patch('/admin/users/:id', userController.updateUser);
router.delete('/admin/users/:id', userController.deleteUser);

// Enrollment routes
router.get('/enrollments', enrollmentController.getEnrollments);
router.post('/enrollments', enrollmentController.enrollStudent);
router.patch('/enrollments/:id', enrollmentController.updateEnrollment);
router.delete('/enrollments/:id', enrollmentController.unenrollStudent);

export default router;
