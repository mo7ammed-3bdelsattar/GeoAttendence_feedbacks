export interface Session {
  id: string;
  courseId: string;
  courseName: string;
  classroomId: string;
  facultyId: string;
  startTime: string;
  endTime: string;
  topic: string;
  status: 'active' | 'ended';
  lat?: number;
  lng?: number;
  geofenceRadiusMeters?: number;
  classroomName?: string;
}

export interface CheckIn {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  checkedInAt: string;
  lat: number;
  lng: number;
  locationVerified: boolean;
}