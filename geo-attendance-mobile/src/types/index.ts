export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'instructor' | 'faculty' | 'admin';
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department?: string;
  facultyId?: string;
  facultyName?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Classroom {
  id: string;
  name: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
}

export interface Session {
  id: string;
  courseId: string;
  course?: Partial<Course>;
  classroomId?: string;
  classroom?: Partial<Classroom>;
  facultyId: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName?: string;
  courseId: string;
  courseName?: string;
  status?: string;
}

export interface Feedback {
  id: string;
  studentId: string;
  studentName?: string;
  courseId: string;
  courseName?: string;
  facultyId?: string;
  facultyName?: string;
  rating: number;
  message?: string;
  createdAt?: string;
}
