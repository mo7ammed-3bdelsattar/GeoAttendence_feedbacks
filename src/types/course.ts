export interface Course {
  id: string;
  name: string;
  code: string;
  isOpen?: boolean;
  departmentId: string;
  departmentName: string;
  facultyId?: string;
  facultyName?: string;
  enrolledCount: number;
}