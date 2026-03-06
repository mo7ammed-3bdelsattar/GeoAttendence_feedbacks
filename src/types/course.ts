export interface Course {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  departmentName: string;
  facultyId?: string;
  facultyName?: string;
  enrolledCount: number;
}