export interface Attendance {
  id: string;
  studentId: string;
  sessionId: string;
  status: 'present' | 'absent' | 'late';
  latitude: number;
  longitude: number;
  timestamp: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';