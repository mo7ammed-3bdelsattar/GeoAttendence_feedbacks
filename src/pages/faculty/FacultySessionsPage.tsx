import { AppShell } from '../../components/layout/AppShell.tsx';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../stores/authStore.ts';
import { adminApi, attendanceApi, sessionApi } from '../../services/api.ts';
import { Calendar, Clock, MapPin, Search } from 'lucide-react';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import type { Session } from '../../types/index.ts';
import toast from 'react-hot-toast';

export function FacultySessionsPage() {
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [attendanceSummary, setAttendanceSummary] = useState<Record<string, { presentCount: number; absentCount: number }>>({});
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setSessions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [sessionData, courseData, classroomData] = await Promise.all([
          sessionApi.getSessionsForFaculty(user.id),
          adminApi.getCourses(),
          adminApi.getClassrooms()
        ]);

        const mapped = sessionData.map((session) => {
          const course = courseData.find((item) => item.id === session.courseId);
          const classroom = classroomData.find((item) => item.id === session.classroomId);
          return {
            ...session,
            courseName: course?.name ?? 'Unknown Course',
            courseCode: course?.code ?? 'N/A',
            classroomName: classroom?.name ?? 'Unknown Classroom'
          };
        });

        setSessions(mapped);
        const attendance = await attendanceApi.getFacultyAttendanceSummary(user.id);
        setAttendanceSummary(
          Object.fromEntries(
            attendance.map((row) => [row.sessionId, { presentCount: row.presentCount, absentCount: row.absentCount }])
          )
        );
      } catch {
        toast.error('Failed to load your sessions.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const today = new Date().toISOString().slice(0, 10);

  const filteredSessions = useMemo(() => {
    return sessions
      .filter((session) => (dateFilter ? session.date === dateFilter : true))
      .filter((session) => {
        if (!search.trim()) return true;
        const query = search.toLowerCase();
        return (
          (session.courseName ?? '').toLowerCase().includes(query) ||
          (session.courseCode ?? '').toLowerCase().includes(query) ||
          (session.classroomName ?? '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  }, [sessions, dateFilter, search]);

  const todaySessions = filteredSessions.filter((session) => session.date === today);
  const upcomingSessions = filteredSessions.filter((session) => session.date > today);

  const getStatusUi = (status?: string) => {
    const normalized = (status || 'UPCOMING').toUpperCase();
    if (normalized === 'ACTIVE') return { label: 'Active', className: 'bg-emerald-100 text-emerald-700' };
    if (normalized === 'ENDED') return { label: 'Ended', className: 'bg-gray-200 text-gray-700' };
    return { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' };
  };

  const handleStartSession = async (sessionId: string) => {
    setProcessingSessionId(sessionId);
    try {
      await sessionApi.startSession(sessionId);
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? { ...session, status: 'ACTIVE', startedAt: new Date().toISOString(), endedAt: null }
            : session
        )
      );
      toast.success('Session started.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to start session.');
    } finally {
      setProcessingSessionId(null);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    setProcessingSessionId(sessionId);
    try {
      await sessionApi.endSession(sessionId);
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? { ...session, status: 'ENDED', endedAt: new Date().toISOString() }
            : session
        )
      );
      toast.success('Session ended.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to end session.');
    } finally {
      setProcessingSessionId(null);
    }
  };

  return (
    <AppShell title="My Sessions">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Sessions</h1>
            <p className="text-sm text-gray-500 mt-1">View and track your scheduled classes.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search course or classroom"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{filteredSessions.length}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Today Sessions</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{todaySessions.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Upcoming</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{upcomingSessions.length}</p>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-16 text-center">
            <p className="text-gray-500">No sessions found for the selected filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSessions.map((session) => {
              const isToday = session.date === today;
              const normalizedStatus = (session.status || 'UPCOMING').toUpperCase();
              const statusUi = getStatusUi(normalizedStatus);
              const isActive = normalizedStatus === 'ACTIVE';
              const isEnded = normalizedStatus === 'ENDED';
              return (
                <div
                  key={session.id}
                  className={`rounded-2xl border p-5 bg-white shadow-sm ${
                    isToday ? 'border-primary/40 ring-2 ring-primary/10' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{session.courseName}</h3>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                        {session.courseCode}
                      </p>
                    </div>
                    {isToday && (
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="mb-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusUi.className}`}>
                      {statusUi.label}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>{new Date(session.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{session.startTime} - {session.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{session.classroomName}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 mt-2 text-xs">
                      <span className="font-semibold text-emerald-700">Present: {attendanceSummary[session.id]?.presentCount ?? 0}</span>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="font-semibold text-rose-700">Absent: {attendanceSummary[session.id]?.absentCount ?? 0}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartSession(session.id)}
                      disabled={processingSessionId === session.id || isActive || isEnded}
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingSessionId === session.id && !isActive ? 'Starting...' : 'Start Session'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEndSession(session.id)}
                      disabled={processingSessionId === session.id || !isActive}
                      className="px-3 py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingSessionId === session.id && isActive ? 'Ending...' : 'End Session'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}