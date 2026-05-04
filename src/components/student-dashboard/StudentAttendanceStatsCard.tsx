import { BarChart3, CalendarCheck2, MessageSquareText, ChevronRight } from 'lucide-react';
import { LoadingSkeleton } from '../ui/LoadingSkeleton.tsx';

interface StudentAttendanceStatsCardProps {
  loading: boolean;
  attendancePercentage: number;
  weeklyAttendanceCount: number;
  feedbackCount: number;
  onViewDetails: () => void;
}

export function StudentAttendanceStatsCard({
  loading,
  attendancePercentage,
  weeklyAttendanceCount,
  feedbackCount,
  onViewDetails
}: StudentAttendanceStatsCardProps) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <LoadingSkeleton className="h-5 w-40 mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-xl border border-gray-100 p-4">
              <LoadingSkeleton className="h-4 w-24 mb-2" />
              <LoadingSkeleton className="h-8 w-16 mb-2" />
              <LoadingSkeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
        <LoadingSkeleton className="h-11 w-36 mt-5" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Attendance Snapshot</h2>
          <p className="text-sm text-gray-500">Your recent attendance and feedback progress.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <BarChart3 className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wider">Attendance %</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{attendancePercentage}%</p>
          <p className="mt-1 text-xs text-gray-600">Attended lectures / total lectures</p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CalendarCheck2 className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wider">This Week</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{weeklyAttendanceCount}</p>
          <p className="mt-1 text-xs text-gray-600">Lectures attended this week</p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <MessageSquareText className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wider">Feedbacks</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{feedbackCount}</p>
          <p className="mt-1 text-xs text-gray-600">Total feedback submitted</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onViewDetails}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        View Details
        <ChevronRight className="h-4 w-4" />
      </button>
    </section>
  );
}
