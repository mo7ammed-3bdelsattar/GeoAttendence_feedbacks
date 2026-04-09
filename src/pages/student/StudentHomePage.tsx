import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { useAuthStore } from '../../stores/authStore.ts';
import { adminApi, enrollmentApi, feedbackApi, studentApi } from '../../services/api.ts';
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

  useEffect(() => {
    const applyFallbackDashboard = (message: string) => {
      setCourses([]);
      setSessions([]);
      setFeedback([]);
      setDashboardMessage(message);
    };

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
        applyFallbackDashboard('Dashboard data is currently unavailable. You can still enroll in open courses.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate, user?.id]);

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
    if (enrolledCourseIds.has(selectedCourseId)) {
      toast.error('You are already enrolled in this course.');
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
      toast.error(error?.response?.data?.error || 'Failed to enroll in course.');
    } finally {
      setEnrolling(false);
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
        const next = normalizedSessions
          .filter((session) => session.courseName === course.name && session.date && session.date >= todayIso)
          .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0];

        return {
          ...course,
          nextSessionDate: next?.date ?? null
        };
      }),
    [courses, normalizedSessions, todayIso]
  );

  return (
    <AppShell title="Home">
      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-32 w-full rounded-xl" />
          <LoadingSkeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
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
              <p className="text-sm text-gray-500">No available courses</p>
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
                  className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <CoursesList courses={coursesWithNextSession} />
          <FeedbackSection pendingCourses={pendingFeedbackCourses} />
        </div>
      )}
    </AppShell>
  );
}
