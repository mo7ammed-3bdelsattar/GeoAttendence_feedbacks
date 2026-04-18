import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { useAuthStore } from '../../stores/authStore.ts';
import { adminApi, enrollmentApi, feedbackApi, notificationApi, studentApi } from '../../services/api.ts';
import type { Course, Enrollment, Feedback, Session } from '../../types/index.ts';
import { StatsCards } from '../../components/student-dashboard/StatsCards.tsx';
import { SessionsList, type StudentSessionItem } from '../../components/student-dashboard/SessionsList.tsx';
import { CoursesList } from '../../components/student-dashboard/CoursesList.tsx';
import { FeedbackSection } from '../../components/student-dashboard/FeedbackSection.tsx';

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
          adminApi.getOpenCourses(),
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

  if (loading) {
    return (
      <AppShell title="Home">
        <LoadingSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell title="Home">
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
    </AppShell>
  );
}
