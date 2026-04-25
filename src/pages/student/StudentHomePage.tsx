import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { useAuthStore } from '../../stores/authStore.ts';
import { adminApi, enrollmentApi, feedbackApi, notificationApi, studentApi } from '../../services/api.ts';
import type { Course, Enrollment, Feedback, Session } from '../../types/index.ts';
import { StatsCards } from '../../components/student-dashboard/StatsCards.tsx';
import { SessionsList, type StudentSessionItem } from '../../components/student-dashboard/SessionsList.tsx';
import { CoursesList } from '../../components/student-dashboard/CoursesList.tsx';
import { FeedbackSection } from '../../components/student-dashboard/FeedbackSection.tsx';
import { StudentAttendanceStatsCard } from '../../components/student-dashboard/StudentAttendanceStatsCard.tsx';
import { getAttendedSessionIdsForStudent } from '../../utils/studentAttendance.ts';

export function StudentHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [dashboardMessage, setDashboardMessage] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [openCourses, setOpenCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [unenrollingCourseId, setUnenrollingCourseId] = useState<string | null>(null);
  const [attendanceStatsLoading, setAttendanceStatsLoading] = useState(true);
  const [attendedSessionIds, setAttendedSessionIds] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const unenrollWindowHours = Number(import.meta.env.VITE_UNENROLL_WINDOW_HOURS ?? 24);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!user?.id) {
        navigate('/login', { replace: true });
        return;
      }

      setLoading(true);
      try {
        const [dashboard, enrollmentRows, openCourseRows, feedbackRows] = await Promise.all([
          studentApi.getStudentDashboard(user.id),
          enrollmentApi.getStudentEnrollments(user.id),
          adminApi.getOpenCourses().catch(() => []),
          feedbackApi.getFeedbackByStudent(user.id).catch(() => [])
        ]);
        setCourses(dashboard?.courses ?? []);
        setSessions(dashboard?.sessions ?? []);
        setFeedback(feedbackRows ?? []);
        setEnrollments(enrollmentRows ?? []);
        setOpenCourses(openCourseRows ?? []);
        setDashboardMessage(null);
      } catch {
        setDashboardMessage('Dashboard data is currently unavailable. You can still enroll in open courses.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate, user?.id]);

  useEffect(() => {
    const resolveAttendanceStats = async () => {
      if (!user?.id || sessions.length === 0) {
        setAttendedSessionIds(new Set());
        setAttendanceStatsLoading(false);
        return;
      }

      setAttendanceStatsLoading(true);
      try {
        const attended = await getAttendedSessionIdsForStudent(sessions, user.id);
        setAttendedSessionIds(attended);
      } catch {
        setAttendedSessionIds(new Set());
      } finally {
        setAttendanceStatsLoading(false);
      }
    };

    void resolveAttendanceStats();
  }, [sessions, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let stopped = false;

    const pollNotifications = async () => {
      try {
        const rows = await notificationApi.getMyNotifications();
        if (stopped) return;
        rows.forEach((notification) => {
          if (!seenNotificationIdsRef.current.has(notification.id) && notification.type === 'session_started') {
            toast.success(`🔔 ${notification.message}`);
          }
          seenNotificationIdsRef.current.add(notification.id);
        });
      } catch {
        // silent polling failure
      }
    };

    pollNotifications();
    const interval = window.setInterval(pollNotifications, 8000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [user?.id]);

  const enrolledCourseIds = useMemo(() => new Set(enrollments.map((row) => row.courseId)), [enrollments]);
  
  const availableCourses = useMemo(
    () => openCourses.filter((course) => !enrolledCourseIds.has(course.id)),
    [openCourses, enrolledCourseIds]
  );

  const handleEnroll = async () => {
    if (!user?.id || !selectedCourseId) {
      toast.error('Please select a course to enroll.');
      return;
    }
    
    const previousCourses = courses;
    const previousEnrollments = enrollments;
    const previousSessions = sessions;
    const previousFeedback = feedback;

    setEnrolling(true);
    try {
      await enrollmentApi.enrollStudent(user.id, selectedCourseId);
      toast.success('Enrollment successful.');

      const [dashboard, enrollmentRows, feedbackRows] = await Promise.all([
        studentApi.getStudentDashboard(user.id),
        enrollmentApi.getStudentEnrollments(user.id),
        feedbackApi.getFeedbackByStudent(user.id).catch(() => [])
      ]);
      setCourses(dashboard?.courses ?? []);
      setSessions(dashboard?.sessions ?? []);
      setEnrollments(enrollmentRows ?? []);
      setFeedback(feedbackRows ?? []);
      setSelectedCourseId('');
    } catch (error: any) {
      setCourses(previousCourses);
      setEnrollments(previousEnrollments);
      setSessions(previousSessions);
      setFeedback(previousFeedback);
      toast.error(error?.response?.data?.error || 'Failed to unenroll from course.');
    } finally {
      setUnenrollingCourseId(null);
    }
  };

  const handleUnenroll = async (courseId: string) => {
    if (!user?.id) return;
    if (!window.confirm('Are you sure you want to unenroll from this course?')) return;

    const previousCourses = courses;
    const previousEnrollments = enrollments;
    const previousSessions = sessions;
    const previousFeedback = feedback;

    setUnenrollingCourseId(courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    setEnrollments((prev) => prev.filter((e) => e.courseId !== courseId));
    setSessions((prev) => prev.filter((s) => s.courseId !== courseId));

    try {
      await enrollmentApi.unenrollMyCourse(courseId);
      toast.success('Unenrolled successfully.');
      const [dashboard, enrollmentRows, feedbackRows] = await Promise.all([
        studentApi.getStudentDashboard(user.id),
        enrollmentApi.getStudentEnrollments(user.id),
        feedbackApi.getFeedbackByStudent(user.id).catch(() => [])
      ]);
      setCourses(dashboard?.courses ?? []);
      setSessions(dashboard?.sessions ?? []);
      setEnrollments(enrollmentRows ?? []);
      setFeedback(feedbackRows ?? []);
    } catch (error: any) {
      setCourses(previousCourses);
      setEnrollments(previousEnrollments);
      setSessions(previousSessions);
      setFeedback(previousFeedback);
      toast.error(error?.response?.data?.error || 'Failed to unenroll from course.');
    } finally {
      setUnenrollingCourseId(null);
    }
  };

  const normalizedSessions = useMemo<StudentSessionItem[]>(
    () =>
      sessions.map((session) => ({
        id: session.id,
        courseName: session.courseName ?? 'Unknown Course',
        classroom: session.classroomName ?? 'TBD',
        date: session.date ?? '',
        startTime: session.startTime ?? '--:--',
        endTime: session.endTime ?? '--:--'
      })),
    [sessions]
  );

  const todayIso = new Date().toISOString().slice(0, 10);

  const todaysSessions = useMemo(
    () => normalizedSessions.filter((session) => session.date?.slice(0, 10) === todayIso),
    [normalizedSessions, todayIso]
  );

  const upcomingSessions = useMemo(
    () => normalizedSessions.filter((session) => session.date && session.date.slice(0, 10) > todayIso),
    [normalizedSessions, todayIso]
  );

  const feedbackCourseIds = useMemo(() => new Set(feedback.map((item) => item.courseId)), [feedback]);
  const pendingFeedbackCourses = useMemo(
    () => courses.filter((course) => !feedbackCourseIds.has(course.id)),
    [courses, feedbackCourseIds]
  );

  const coursesWithNextSession = useMemo(
    () =>
      courses.map((course) => {
        const enrollment = enrollments.find((row) => row.courseId === course.id);
        const next = normalizedSessions
          .filter((session) => session.courseName === course.name && session.date && session.date >= todayIso)
          .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0];

        return {
          ...course,
          nextSessionDate: next?.date ?? null,
          enrolledAt: enrollment?.enrolledAt || enrollment?.createdAt
        };
      }),
    [courses, enrollments, normalizedSessions, todayIso]
  );

  const totalLectures = sessions.length;
  const attendedLecturesCount = attendedSessionIds.size;
  const attendancePercentage = totalLectures > 0
    ? Math.round((attendedLecturesCount / totalLectures) * 100)
    : 0;

  const startOfWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  const weeklyAttendanceCount = useMemo(
    () =>
      sessions.filter((session) => {
        if (!attendedSessionIds.has(session.id) || !session.date) return false;
        const sessionDate = new Date(session.date);
        return sessionDate >= startOfWeek;
      }).length,
    [sessions, attendedSessionIds, startOfWeek]
  );

  const attendedLectureDetails = useMemo(
    () =>
      sessions
        .filter((session) => attendedSessionIds.has(session.id))
        .sort((a, b) => `${b.date || ''} ${b.startTime || ''}`.localeCompare(`${a.date || ''} ${a.startTime || ''}`)),
    [sessions, attendedSessionIds]
  );

  const courseNameById = useMemo(
    () => new Map(courses.map((course) => [course.id, course.name])),
    [courses]
  );

  const feedbackDetails = useMemo(
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
      <AppShell title="Home">
        <LoadingSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell title="Home">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="space-y-6">
        {dashboardMessage && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-center justify-between gap-3">
            <span>{dashboardMessage}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-lg border border-amber-300 hover:bg-amber-100 font-medium"
            >
              Retry
            </button>
          </section>
        )}

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Enroll in Course</h2>
          {availableCourses.length === 0 ? (
            <p className="text-sm text-gray-500">No available courses for enrollment at the moment.</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                aria-label="Select open course"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="flex-1 h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="">Select an open course...</option>
                {availableCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code}: {course.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleEnroll}
                disabled={enrolling || !selectedCourseId}
                className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {enrolling ? 'Enrolling...' : 'Enroll'}
              </button>
            </div>
          )}
        </section>

        <StatsCards
          totalCourses={courses.length}
          upcomingSessions={upcomingSessions.length}
          feedbackGiven={feedback.length}
        />
        <SessionsList title="Today's Sessions" sessions={todaysSessions} emptyText="No sessions today" />
        <CoursesList
          courses={coursesWithNextSession}
          onUnenroll={handleUnenroll}
          unenrollingCourseId={unenrollingCourseId}
          unenrollWindowHours={Number.isFinite(unenrollWindowHours) && unenrollWindowHours > 0 ? unenrollWindowHours : 24}
        />
        <FeedbackSection pendingCourses={pendingFeedbackCourses} />
        </div>

        {user?.role === 'student' && (
          <aside className="xl:sticky xl:top-20">
            <div onClick={() => !attendanceStatsLoading && setDetailsOpen(true)} className="cursor-pointer">
              <StudentAttendanceStatsCard
                loading={attendanceStatsLoading}
                attendancePercentage={attendancePercentage}
                weeklyAttendanceCount={weeklyAttendanceCount}
                feedbackCount={feedback.length}
                onViewDetails={() => setDetailsOpen(true)}
              />
            </div>
          </aside>
        )}

        {detailsOpen && (
          <>
            <button
              type="button"
              aria-label="Close details panel backdrop"
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setDetailsOpen(false)}
            />
            <aside className="fixed top-0 right-0 h-full w-full max-w-xl bg-white z-50 shadow-2xl border-l border-gray-200 overflow-y-auto">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Attendance Details</h3>
                  <p className="text-sm text-gray-500">Lectures attended and submitted feedback.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  aria-label="Close details panel"
                  title="Close"
                  className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              <div className="p-5 space-y-6">
                <section>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Attended Lectures</h4>
                  {attendedLectureDetails.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No attendance yet. Once you attend lectures, details will appear here.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {attendedLectureDetails.map((session) => (
                        <article key={session.id} className="rounded-xl border border-gray-100 p-4">
                          <h5 className="text-sm font-semibold text-gray-900">{session.courseName ?? 'Unknown Lecture'}</h5>
                          <p className="text-sm text-gray-600 mt-1">
                            {session.date || 'No date'} | {session.startTime || '--:--'} - {session.endTime || '--:--'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Location: {session.classroomName || 'Not specified'}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Submitted Feedbacks</h4>
                  {feedbackDetails.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No feedback submitted yet. Add your feedback after lectures.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {feedbackDetails.map((item) => (
                        <article key={item.id} className="rounded-xl border border-gray-100 p-4">
                          <h5 className="text-sm font-semibold text-gray-900">
                            {courseNameById.get(item.courseId) ?? 'Unknown Lecture'}
                          </h5>
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
            </aside>
          </>
        )}
        </div>
    </AppShell>
  );
}
