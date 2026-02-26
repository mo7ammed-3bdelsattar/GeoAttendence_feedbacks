export const API_BASE_URL = 'https://api.university-app.com';

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  STUDENTS: '/students',
  STUDENTS_ADD: '/students/add',
  STUDENTS_EDIT: '/students/:id/edit',
} as const;

export function buildStudentEditPath(id: string): string {
  return `/students/${id}/edit`;
}
