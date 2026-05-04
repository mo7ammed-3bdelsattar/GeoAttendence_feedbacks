import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.ts';
import { getAccessToken } from '../utils/storage.ts';
import type { UserRole } from '../types/index.ts';

import { LoginPage } from '../pages/auth/LoginPage.tsx';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage.tsx';

import { StudentHomePage } from '../pages/student/StudentHomePage.tsx';
import { StudentProfilePage } from '../pages/student/StudentProfilePage.tsx';
import { StudentFeedbackPage } from '../pages/student/StudentFeedbackPage.tsx';
import { StudentSessionsPage } from '../pages/student/StudentSessionsPage.tsx';
import { StudentSchedulePage } from '../pages/student/StudentSchedulePage.tsx';
import { StudentChatbotPage } from '../pages/student/StudentChatbotPage.tsx';
import { StudentChatPage } from '../pages/student/StudentChatPage.tsx';

import { AdminOverviewPage } from '../pages/admin/AdminOverviewPage.tsx';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage.tsx';
import { AdminUserSignupPage } from '../pages/admin/AdminUserSignupPage.tsx';
import { AdminEnrollmentsPage } from '../pages/admin/AdminEnrollmentsPage.tsx';
import { AdminDepartmentsPage } from '../pages/admin/AdminDepartmentsPage.tsx';
import { AdminCoursesPage } from '../pages/admin/AdminCoursesPage.tsx';
import { AdminClassroomsPage } from '../pages/admin/AdminClassroomsPage.tsx';
import { AdminSessionsPage } from '../pages/admin/AdminSessionsPage.tsx';
import { AdminFeedbackAuditPage } from '../pages/admin/AdminFeedbackAuditPage.tsx';
import { AdminPoliciesPage } from '../pages/admin/AdminPoliciesPage.tsx';
import { AdminGroupsPage } from '../pages/admin/AdminGroupsPage.tsx';
import { AdminChatThreadsPage } from '../pages/admin/AdminChatThreadsPage.tsx';
import { AdminChatPage } from '../pages/admin/AdminChatPage.tsx';

import { FacultySessionsPage } from '../pages/faculty/FacultySessionsPage.tsx';
import { FacultyFeedbackPage } from '../pages/faculty/FacultyFeedbackPage.tsx';
import { FacultyReportsPage } from '../pages/faculty/FacultyReportsPage.tsx';
import { AttendanceSummaryPage } from '../pages/faculty/AttendanceSummaryPage.tsx';
import { RoleGuard } from '../components/RoleGuard.tsx';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasToken = !!getAccessToken();

  if (!isAuthenticated || !user || !hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
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
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="student" screen="Student Home">
          <StudentHomePage />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/profile',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="student" screen="Student Profile">
          <StudentProfilePage />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/feedback',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="student" screen="Student Feedback">
          <StudentFeedbackPage />
        </RoleGuard>
      </ProtectedRoute>
    ),
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
    path: '/student/chatbot',
    element: <ProtectedRoute allowedRoles={['student']}><StudentChatbotPage /></ProtectedRoute>,
  },
  {
    path: '/student/chat',
    element: <ProtectedRoute allowedRoles={['student']}><StudentChatPage /></ProtectedRoute>,
  },

  {
    path: '/faculty',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="faculty" screen="Faculty Home">
          <Navigate to="/faculty/sessions" replace />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: '/faculty/sessions',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="faculty" screen="Faculty Sessions">
          <FacultySessionsPage />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: '/faculty/ratings',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="faculty" screen="Faculty Feedback">
          <FacultyFeedbackPage />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: '/faculty/attendance-summary/:sessionId',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="faculty" screen="Faculty Attendance Summary">
          <AttendanceSummaryPage />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: '/faculty/reports',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="faculty" screen="Faculty Reports">
          <FacultyReportsPage />
        </RoleGuard>
      </ProtectedRoute>
    ),
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
    path: '/admin/groups',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminGroupsPage />
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
  {
    path: '/admin/policies',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminPoliciesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/chatbot',
    element: <ProtectedRoute allowedRoles={['admin']}><StudentChatbotPage /></ProtectedRoute>,
  },
  {
    path: '/admin/chats',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminChatThreadsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/chat/:studentId',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminChatPage />
      </ProtectedRoute>
    ),
  },

  { path: '*', element: <Navigate to="/login" replace /> },
]);
