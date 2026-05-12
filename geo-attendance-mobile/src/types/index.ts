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
  description?: string;
}

export interface Classroom {
  id: string;
  name: string;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  location?: string;
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
  attended?: boolean;
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

export interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  borrowPrice?: number;
  isBorrowable: boolean;
  description: string;
  category: string;
  coverImage: string;
}

export type CartAction = 'buy' | 'borrow';

export interface CartItem extends Book {
  quantity: number;
  action: CartAction;
  duration?: number;
}
