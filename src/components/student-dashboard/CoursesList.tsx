import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, User } from 'lucide-react';

export interface StudentCourseCardItem {
  id: string;
  code: string;
  name: string;
  facultyName?: string;
  nextSessionDate?: string | null;
  enrolledAt?: string;
}

interface CoursesListProps {
  loading?: boolean;
  courses: StudentCourseCardItem[];
  onUnenroll?: (courseId: string) => void;
  unenrollingCourseId?: string | null;
  unenrollWindowHours?: number;
}

function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export function CoursesList({
  loading = false,
  courses,
  onUnenroll,
  unenrollingCourseId = null,
  unenrollWindowHours = 24
}: CoursesListProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const windowMs = useMemo(() => unenrollWindowHours * 60 * 60 * 1000, [unenrollWindowHours]);
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">My Courses</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-40 rounded-xl bg-gray-100" />
          <div className="h-40 rounded-xl bg-gray-100" />
        </div>
      ) : courses.length === 0 ? (
        <p className="text-sm text-gray-500">No enrolled courses found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            (() => {
              const enrolledAtMs = course.enrolledAt ? new Date(course.enrolledAt).getTime() : NaN;
              const remainingMs = Number.isNaN(enrolledAtMs) ? 0 : windowMs - (nowMs - enrolledAtMs);
              const canUnenroll = remainingMs > 0;
              const isNearDeadline = remainingMs > 0 && remainingMs <= 2 * 60 * 60 * 1000;

              return (
                <div
                  key={course.id}
                  className={`rounded-xl border p-4 ${
                    isNearDeadline ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100 bg-gray-50/60'
                  }`}
                >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{course.code}: {course.name}</p>
                  <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {course.facultyName || 'Faculty not assigned'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Next session: {course.nextSessionDate ? new Date(course.nextSessionDate).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className={`text-xs mt-1 ${isNearDeadline ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
                    {canUnenroll
                      ? `You can unenroll in: ${formatRemainingTime(remainingMs)}`
                      : 'Unenrollment period expired (24 hours passed)'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  to="/student/sessions"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  View Sessions
                </Link>
                <Link
                  to={`/student/feedback?courseId=${course.id}`}
                  className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
                >
                  Give Feedback
                </Link>
                <button
                  type="button"
                  onClick={() => onUnenroll?.(course.id)}
                  disabled={!onUnenroll || unenrollingCourseId === course.id || !canUnenroll}
                  className="px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {unenrollingCourseId === course.id ? 'Unenrolling...' : canUnenroll ? 'Unenroll' : 'Unenroll Expired'}
                </button>
              </div>
                </div>
              );
            })()
          ))}
        </div>
      )}
    </section>
  );
}
