import { Link } from 'react-router-dom';
import { BookOpen, User } from 'lucide-react';

export interface StudentCourseCardItem {
  id: string;
  code: string;
  name: string;
  facultyName?: string;
  nextSessionDate?: string | null;
}

interface CoursesListProps {
  loading?: boolean;
  courses: StudentCourseCardItem[];
}

export function CoursesList({ loading = false, courses }: CoursesListProps) {
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
            <div key={course.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
