export interface SessionEntity {
  id?: string;
  courseId: string;
  facultyId: string;
  classroomId: string;
  date: string;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export type SessionPayload = Omit<SessionEntity, 'id' | 'createdAt'>;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidDate(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function validateSessionPayload(payload: unknown): { valid: boolean; message?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, message: 'Invalid payload.' };
  }

  const { courseId, facultyId, classroomId, date, startTime, endTime } = payload as Record<string, unknown>;

  if (!courseId || !facultyId || !classroomId || !date || !startTime || !endTime) {
    return { valid: false, message: 'courseId, facultyId, classroomId, date, startTime and endTime are required.' };
  }

  if (!isValidDate(String(date))) {
    return { valid: false, message: 'Invalid date format.' };
  }

  if (!TIME_RE.test(String(startTime)) || !TIME_RE.test(String(endTime))) {
    return { valid: false, message: 'Time must be in HH:mm format.' };
  }

  const start = toMinutes(String(startTime));
  const end = toMinutes(String(endTime));
  if (start >= end) {
    return { valid: false, message: 'endTime must be later than startTime.' };
  }

  return { valid: true };
}

export function hasTimeOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const aStartMin = toMinutes(aStart);
  const aEndMin = toMinutes(aEnd);
  const bStartMin = toMinutes(bStart);
  const bEndMin = toMinutes(bEnd);

  return aStartMin < bEndMin && aEndMin > bStartMin;
}
