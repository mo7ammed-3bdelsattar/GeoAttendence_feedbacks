export interface Session {
  id: string;
  courseId: string;
  courseName?: string;
  classroomId: string;
  facultyId: string;
  date: string;
  startTime: string;
  endTime: string;
  createdAt?: string;
  topic?: string;
  status?: 'UPCOMING' | 'ACTIVE' | 'ENDED' | 'scheduled' | 'active' | 'ended';
  startedAt?: string | null;
  endedAt?: string | null;
  classroomName?: string;
  facultyName?: string;
  courseCode?: string;
  title?: string;
  attended?: boolean;
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