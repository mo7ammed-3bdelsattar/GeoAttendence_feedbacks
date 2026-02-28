export * from './auth.ts';

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Classroom {
  id: string;
  name: string;
  building: string;
  lat: number;
  lng: number;
  geofenceRadiusMeters: number;
}

export interface Session {
  id: string;
  courseId: string;
  courseName: string;
  classroomId: string;
  facultyId: string;
  startTime: string;
  endTime: string;
  topic: string;
  status: 'active' | 'closed';
}

export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  checkInTime: string;
  status: 'present' | 'absent' | 'late';
  lat: number;
  lng: number;
}
