import { Link } from 'react-router-dom';
import { MessageSquareWarning } from 'lucide-react';

interface PendingFeedbackItem {
  id: string;
  code: string;
  name: string;
}

interface FeedbackSectionProps {
  loading?: boolean;
  pendingCourses: PendingFeedbackItem[];
}

export function FeedbackSection({ loading = false, pendingCourses }: FeedbackSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Pending Feedback</h2>
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-14 rounded-xl bg-gray-100" />
          <div className="h-14 rounded-xl bg-gray-100" />
        </div>
      ) : pendingCourses.length === 0 ? (
        <p className="text-sm text-gray-500">All feedback submissions are complete. Great job!</p>
      ) : (
        <div className="space-y-3">
          {pendingCourses.map((course) => (
            <div key={course.id} className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{course.code}: {course.name}</p>
                <p className="text-xs text-amber-700 inline-flex items-center gap-1 mt-1">
                  <MessageSquareWarning className="h-3.5 w-3.5" />
                  Feedback pending
                </p>
              </div>
              <Link
                to={`/student/feedback?courseId=${course.id}`}
                className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
              >
                Give Feedback
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
