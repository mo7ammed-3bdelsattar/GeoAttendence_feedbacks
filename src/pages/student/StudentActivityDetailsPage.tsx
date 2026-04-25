import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { useAuthStore } from '../../stores/authStore.ts';
import { feedbackApi, studentApi } from '../../services/api.ts';
import type { Course, Feedback, Session } from '../../types/index.ts';
import { getAttendedSessionIdsForStudent } from '../../utils/studentAttendance.ts';

export function StudentActivityDetailsPage() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [attendedSessionIds, setAttendedSessionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchDetails = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [dashboard, feedbackRows] = await Promise.all([
          studentApi.getStudentDashboard(user.id),
          feedbackApi.getFeedbackByStudent(user.id).catch(() => [])
        ]);
        const dashboardSessions = dashboard?.sessions ?? [];
        setSessions(dashboardSessions);
        setCourses(dashboard?.courses ?? []);
        setFeedback(feedbackRows ?? []);

        const attended = await getAttendedSessionIdsForStudent(dashboardSessions, user.id);
        setAttendedSessionIds(attended);
      } finally {
        setLoading(false);
      }
    };

    void fetchDetails();
  }, [user?.id]);

  const courseNameMap = useMemo(
    () => new Map(courses.map((course) => [course.id, course.name])),
    [courses]
  );

  const attendedLectures = useMemo(
    () =>
      sessions
        .filter((session) => attendedSessionIds.has(session.id))
        .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)),
    [sessions, attendedSessionIds]
  );

  const feedbackRows = useMemo(
    () =>
      [...feedback].sort((a, b) => {
        const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return right - left;
      }),
    [feedback]
  );

  if (loading) {
    return (
      <AppShell title="Activity Details">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <LoadingSkeleton className="h-6 w-44 mb-4" />
            <div className="space-y-3">
              {[0, 1, 2].map((row) => (
                <LoadingSkeleton key={row} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <LoadingSkeleton className="h-6 w-48 mb-4" />
            <div className="space-y-3">
              {[0, 1, 2].map((row) => (
                <LoadingSkeleton key={row} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Activity Details">
      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Attended Lectures</h2>
          {attendedLectures.length === 0 ? (
            <p className="text-sm text-gray-500">
              You have not attended any lectures yet. Attend your upcoming sessions and your activity will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {attendedLectures.map((session) => (
                <article key={session.id} className="rounded-xl border border-gray-100 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">{session.courseName ?? 'Unknown Lecture'}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {session.date || 'No date'} | {session.startTime || '--:--'} - {session.endTime || '--:--'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Location: {session.classroomName || session.classroomId || 'Not specified'}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Submitted Feedbacks</h2>
          {feedbackRows.length === 0 ? (
            <p className="text-sm text-gray-500">
              You have not submitted feedback yet. Share your thoughts after your sessions to help improve courses.
            </p>
          ) : (
            <div className="space-y-3">
              {feedbackRows.map((item) => (
                <article key={item.id} className="rounded-xl border border-gray-100 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {courseNameMap.get(item.courseId) ?? 'Unknown Lecture'}
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">Rating: {item.rating}/5</p>
                  <p className="text-sm text-gray-600 mt-1">{item.message?.trim() || 'No written feedback provided.'}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Date unavailable'}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
