import { useMemo } from 'react';

export type AttendanceSummaryRow = {
  studentId: string;
  studentName: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: 'PRESENT_FULL' | 'PRESENT_NO_CHECKOUT' | 'ABSENT';
};

export interface AttendanceSummaryModel {
  totalEnrolled: number;
  totalPresent: number;
  totalAbsent: number;
  checkedInOnly: number;
  checkedInAndOut: number;
  students: AttendanceSummaryRow[];
}

interface AttendanceSummaryProps {
  summary: AttendanceSummaryModel;
}

function formatTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AttendanceSummary({ summary }: AttendanceSummaryProps) {
  const csvContent = useMemo(() => {
    const header = ['Student ID', 'Student Name', 'Check In', 'Check Out', 'Status'];
    const rows = summary.students.map((student) => [
      student.studentId,
      student.studentName,
      student.checkInAt ?? '—',
      student.checkOutAt ?? '—',
      student.status,
    ]);
    const lines = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    return `data:text/csv;charset=utf-8,${lines.join('\n')}`;
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">✅ حضروا كامل</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-700">{summary.checkedInAndOut}</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">⚠️ دخلوا بس</p>
          <p className="mt-3 text-3xl font-semibold text-amber-700">{summary.checkedInOnly}</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">❌ غابوا</p>
          <p className="mt-3 text-3xl font-semibold text-rose-700">{summary.totalAbsent}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-gray-900">Attendance Summary</h2>
          <a
            href={csvContent}
            download="attendance-summary.csv"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
          >
            Export CSV
          </a>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Check In</th>
                <th className="px-4 py-3">Check Out</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.students.map((student) => (
                <tr
                  key={student.studentId}
                  className={`border-t ${student.status === 'PRESENT_FULL' ? 'bg-emerald-50' : student.status === 'PRESENT_NO_CHECKOUT' ? 'bg-amber-50' : 'bg-rose-50'}`}
                >
                  <td className="px-4 py-4 font-medium text-gray-900">{student.studentName}</td>
                  <td className="px-4 py-4">{formatTime(student.checkInAt)}</td>
                  <td className="px-4 py-4">{formatTime(student.checkOutAt)}</td>
                  <td className="px-4 py-4 font-semibold uppercase tracking-wide text-xs">
                    {student.status === 'PRESENT_FULL' ? '🟢 PRESENT_FULL' : student.status === 'PRESENT_NO_CHECKOUT' ? '🟡 PRESENT_NO_CHECKOUT' : '🔴 ABSENT'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
