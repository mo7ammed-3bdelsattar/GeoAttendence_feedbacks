export interface Student {
  id: string;
  fullName: string;
  email: string;
  studentId: string;
  department: string;
  createdAt: string;
}

export interface CreateStudentPayload {
  fullName: string;
  email: string;
  studentId: string;
  department: string;
}

export type UpdateStudentPayload = Partial<CreateStudentPayload>;
