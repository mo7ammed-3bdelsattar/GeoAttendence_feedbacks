import { attendanceApi } from '../services/api.ts';
import type { Session } from '../types/index.ts';

const PRESENT_STATUSES = new Set(['present', 'late']);

export async function getAttendedSessionIdsForStudent(
  sessions: Session[],
  studentId: string
): Promise<Set<string>> {
  const relevantSessions = sessions.filter((session) => Boolean(session.id));
  if (relevantSessions.length === 0) {
    return new Set<string>();
  }

  const attendanceChecks = await Promise.allSettled(
    relevantSessions.map(async (session) => {
      const result = await attendanceApi.getSessionAttendance(session.id);
      const hasAttendance = result.records.some(
        (record) => record.studentId === studentId && PRESENT_STATUSES.has(record.status)
      );
      return hasAttendance ? session.id : null;
    })
  );

  return new Set(
    attendanceChecks
      .filter((check): check is PromiseFulfilledResult<string | null> => check.status === 'fulfilled')
      .map((check) => check.value)
      .filter((sessionId): sessionId is string => Boolean(sessionId))
  );
}
