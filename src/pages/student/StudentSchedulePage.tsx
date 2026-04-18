import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { studentApi } from '../../services/api.ts';
import toast from 'react-hot-toast';
import { CalendarDays } from 'lucide-react';

type ScheduleRow = {
  courseId: string;
  courseName: string;
  instructorName: string;
  day: string;
  time: string;
};

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Unscheduled'];

function getStartMinutes(timeRange: string): number {
  const start = timeRange.split(' - ')[0] ?? '';
  const [h, m] = start.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return Number.MAX_SAFE_INTEGER;
  return h * 60 + m;
}

export function StudentSchedulePage() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const data = await studentApi.getMyCourses();
        setRows(data ?? []);
      } catch {
        toast.error('Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return getStartMinutes(a.time) - getStartMinutes(b.time);
      }),
    [rows]
  );

  return (
    <AppShell title="My Schedule">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">View your enrolled course timetable.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="animate-pulse divide-y divide-gray-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 px-5 py-4">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-500">
            <div className="flex flex-col items-center gap-2">
              <CalendarDays className="h-10 w-10 text-gray-300" />
              <p className="font-medium text-gray-600">No enrolled courses.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-2xl border border-gray-100 bg-white overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Course Name</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Instructor Name</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Day</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedRows.map((row) => (
                    <tr key={`${row.courseId}-${row.day}-${row.time}`} className="hover:bg-gray-50/70">
                      <td className="px-5 py-3 text-sm text-gray-900">{row.courseName}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">{row.instructorName}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">{row.day}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden grid grid-cols-1 gap-3">
              {sortedRows.map((row) => (
                <div key={`${row.courseId}-${row.day}-${row.time}`} className="rounded-xl border border-gray-100 bg-white p-4">
                  <h3 className="font-semibold text-gray-900">{row.courseName}</h3>
                  <p className="text-sm text-gray-600 mt-1">{row.instructorName}</p>
                  <div className="mt-3 flex items-center justify-between text-sm text-gray-700">
                    <span>{row.day}</span>
                    <span>{row.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
