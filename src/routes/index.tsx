import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.ts';
import { getAccessToken } from '../utils/storage.ts';
import type { UserRole } from '../types/index.ts';

import { LoginPage } from '../pages/auth/LoginPage.tsx';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage.tsx';
import { ProfilePage } from '../pages/profile/ProfilePage.tsx';

import { StudentHomePage } from '../pages/student/StudentHomePage.tsx';
import { StudentFeedbackPage } from '../pages/student/StudentFeedbackPage.tsx';
import { StudentSessionsPage } from '../pages/student/StudentSessionsPage.tsx';
import { StudentSchedulePage } from '../pages/student/StudentSchedulePage.tsx';

import { AdminOverviewPage } from '../pages/admin/AdminOverviewPage.tsx';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage.tsx';
import { AdminUserSignupPage } from '../pages/admin/AdminUserSignupPage.tsx';
import { AdminEnrollmentsPage } from '../pages/admin/AdminEnrollmentsPage.tsx';
import { AdminDepartmentsPage } from '../pages/admin/AdminDepartmentsPage.tsx';
import { AdminCoursesPage } from '../pages/admin/AdminCoursesPage.tsx';
import { AdminClassroomsPage } from '../pages/admin/AdminClassroomsPage.tsx';
import { AdminSessionsPage } from '../pages/admin/AdminSessionsPage.tsx';
import { AdminFeedbackAuditPage } from '../pages/admin/AdminFeedbackAuditPage.tsx';
import { FacultySessionsPage } from '../pages/faculty/FacultySessionsPage.tsx';
import { FacultyFeedbackPage } from '../pages/faculty/FacultyFeedbackPage.tsx';

const resolveDashboardPath = (role: UserRole | string) => {
  if (role === 'student') return '/student';
  if (role === 'faculty' || role === 'doctor') return '/faculty';
  return '/admin';
};

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: UserRole[] }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasToken = !!getAccessToken();

  if (!isAuthenticated || !user || !hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={resolveDashboardPath(user.role)} replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated && user) {
    return <Navigate to={resolveDashboardPath(user.role)} replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <PublicRoute><LoginPage /></PublicRoute> },
  { path: '/forgot-password', element: <PublicRoute><ForgotPasswordPage /></PublicRoute> },
  {
    path: '/profile',
    element: <ProtectedRoute allowedRoles={['student', 'faculty', 'admin']}><ProfilePage /></ProtectedRoute>,
  },

  {
    path: '/student',
    element: <ProtectedRoute allowedRoles={['student']}><StudentHomePage /></ProtectedRoute>,
  },
  {
    path: '/student/feedback',
    element: <ProtectedRoute allowedRoles={['student']}><StudentFeedbackPage /></ProtectedRoute>,
  },
  {
    path: '/student/sessions',
    element: <ProtectedRoute allowedRoles={['student']}><StudentSessionsPage /></ProtectedRoute>,
  },
  {
    path: '/student/schedule',
    element: <ProtectedRoute allowedRoles={['student']}><StudentSchedulePage /></ProtectedRoute>,
  },

  {
    path: '/faculty',
    element: <ProtectedRoute allowedRoles={['faculty']}><Navigate to="/faculty/sessions" replace /></ProtectedRoute>,
  },
  {
    path: '/faculty/sessions',
    element: <ProtectedRoute allowedRoles={['faculty']}><FacultySessionsPage /></ProtectedRoute>,
  },
  {
    path: '/faculty/ratings',
    element: <ProtectedRoute allowedRoles={['faculty']}><FacultyFeedbackPage /></ProtectedRoute>,
  },

  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['admin']}><AdminOverviewPage /></ProtectedRoute>,
  },
  {
    path: '/admin/users',
    element: <ProtectedRoute allowedRoles={['admin']}><AdminUsersPage /></ProtectedRoute>,
  },
  {
    path: '/admin/users/signup',
    element: <ProtectedRoute allowedRoles={['admin']}><AdminUserSignupPage /></ProtectedRoute>,
  },
  {
    path: '/admin/enrollments',
    element: <ProtectedRoute allowedRoles={['admin']}><AdminEnrollmentsPage /></ProtectedRoute>,
  },
  {
    path: '/admin/sessions',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminSessionsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/departments',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDepartmentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/courses',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminCoursesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/classrooms',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminClassroomsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/feedback',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminFeedbackAuditPage />
      </ProtectedRoute>
    ),
  },

  { path: '*', element: <Navigate to="/login" replace /> },
]);
