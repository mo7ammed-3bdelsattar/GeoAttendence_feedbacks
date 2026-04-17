import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { AttendanceSummary, type AttendanceSummaryModel } from '../../components/AttendanceSummary.tsx';
import { sessionApi } from '../../services/api.ts';

export function AttendanceSummaryPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AttendanceSummaryModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      if (!sessionId) return;
      setLoading(true);
      try {
        const data = await sessionApi.getSessionSummary(sessionId);
        setSummary(data);
      } catch (error: any) {
        console.error('Failed to load attendance summary', error);
        toast.error(error?.response?.data?.message || 'Failed to load attendance summary.');
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [sessionId]);

  return (
    <AppShell title="Attendance Summary">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Summary</h1>
            <p className="text-sm text-gray-500">Review attendance status for this session.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/faculty/sessions')}
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to sessions
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-sm">
            Loading attendance summary...
          </div>
        ) : summary ? (
          <AttendanceSummary summary={summary} />
        ) : (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-12 text-center text-red-700 shadow-sm">
            Unable to load attendance summary.
          </div>
        )}
      </div>
    </AppShell>
  );
}
