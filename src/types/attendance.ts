export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  checkInTime: string;
  status: 'present' | 'absent' | 'late';
  lat: number;
  lng: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';