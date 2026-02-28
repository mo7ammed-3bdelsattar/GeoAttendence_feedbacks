import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.ts';
import { getAccessToken } from '../utils/storage.ts';
import type { UserRole } from '../types/index.ts';

import { LoginPage } from '../pages/auth/LoginPage.tsx';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage.tsx';

import { StudentHomePage } from '../pages/student/StudentHomePage.tsx';
import { StudentProfilePage } from '../pages/student/StudentProfilePage.tsx';

import { AdminOverviewPage } from '../pages/admin/AdminOverviewPage.tsx';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage.tsx';
import { AdminUserSignupPage } from '../pages/admin/AdminUserSignupPage.tsx';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: UserRole[] }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.clearSession);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (!getAccessToken()) {
    clearSession();
    return <Navigate to="/login" replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    const base = user.role === 'student' ? '/student' : user.role === 'faculty' ? '/faculty' : '/admin';
    return <Navigate to={base} replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated && user) {
    const base = user.role === 'student' ? '/student' : user.role === 'faculty' ? '/faculty' : '/admin';
    return <Navigate to={base} replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <PublicRoute><LoginPage /></PublicRoute> },
  { path: '/forgot-password', element: <PublicRoute><ForgotPasswordPage /></PublicRoute> },

  {
    path: '/student',
    element: <ProtectedRoute allowedRoles={['student']}><StudentHomePage /></ProtectedRoute>,
  },
    {
    path: '/student/profile',
    element: <ProtectedRoute allowedRoles={['student']}><StudentProfilePage /></ProtectedRoute>,
  },
  { path: '/faculty', element: <Navigate to="/faculty/sessions" replace /> },

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

  { path: '*', element: <Navigate to="/login" replace /> },
]);
