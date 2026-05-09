export type UserRole = 'student' | 'faculty' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  role: UserRole;
}
