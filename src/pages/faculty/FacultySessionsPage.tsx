import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Edit2, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { DataTable, type Column } from '../../components/ui/DataTable.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { adminApi, attendanceApi, sessionApi } from '../../services/api.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import type { Session } from '../../types/index.ts';

function parseSessionDateTime(session: Session, key: 'startTime' | 'endTime') {
  const rawValue = session[key];
  if (!rawValue) return null;

  const parsed = new Date(rawValue);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  if (session.date && /^\d{1,2}:\d{2}/.test(rawValue)) {
    const combined = new Date(`${session.date}T${rawValue}`);
    if (!Number.isNaN(combined.getTime())) {
      return combined;
    }
  }

  return null;
}

export function FacultySessionsPage() {
  const navigate = useNavigate();
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
      // Backend now enriches sessions with course/faculty/classroom objects
      const sessionData = await sessionApi.getSessionsForFaculty(user.id);

      const mapped = sessionData.map((session: any) => ({
        ...session,
        // Support both enriched nested objects and legacy flat fields
        courseName:    session.course?.name      ?? session.courseName    ?? 'Unknown Course',
        courseCode:    session.course?.code      ?? session.courseCode    ?? 'N/A',
        classroomName: session.classroom?.name   ?? session.classroomName ?? 'Unknown Classroom',
      }));

      setSessions(mapped);

      // Attendance summary
      try {
        const attendance = await attendanceApi.getFacultyAttendanceSummary(user.id);
        setAttendanceSummary(
          Object.fromEntries(
            attendance.map((row) => [row.sessionId, { presentCount: row.presentCount, absentCount: row.absentCount }])
          )
        );
      } catch (e) {
        console.warn('Attendance summary not available', e);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load your sessions.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (sessionId: string) => {
    setActiveSessionOp(sessionId);
    try {
      await sessionApi.startSessionById(sessionId);
      setSessions((prev) => prev.map((session) =>
        session.id === sessionId ? { ...session, status: 'active', startedAt: new Date().toISOString(), checkInDeadline: new Date(Date.now() + 15 * 60 * 1000).toISOString() } : session
      ));
      toast.success('Session started successfully. QR code is now available.');
      await handleFetchQr(sessionId);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Unable to start session.');
    } finally {
      setActiveSessionOp(null);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    setActiveSessionOp(sessionId);
    try {
      await sessionApi.endSession(sessionId);
      setSessions((prev) => prev.map((session) =>
        session.id === sessionId ? { ...session, status: 'ended' } : session
      ));
      setSessionQrs((prev) => {
        const copy = { ...prev };
        delete copy[sessionId];
        return copy;
      });
      if (liveQrSessionId === sessionId) {
        setLiveQrSessionId(null);
      }
      toast.success('Session ended and attendance summary generated.');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Unable to end session.');
    } finally {
      setActiveSessionOp(null);
    }
  };

  const handleFetchQr = async (sessionId: string) => {
    setActiveSessionOp(sessionId);
    try {
      const qr = await sessionApi.getSessionQr(sessionId);
      setSessionQrs((prev) => ({ ...prev, [sessionId]: qr }));
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Unable to load session QR.');
    } finally {
      setActiveSessionOp(null);
    }
  };

  useEffect(() => {
    if (!liveQrSessionId) return;
    const timer = setInterval(() => {
      handleFetchQr(liveQrSessionId);
    }, 30000);
    return () => clearInterval(timer);
  }, [liveQrSessionId]);

  const filteredSessions = useMemo(() => {
    return sessions
      .filter((session) => {
        if (!dateFilter) return true;
        const startDate = parseSessionDateTime(session, 'startTime');
        if (!startDate) return false;
        return startDate.toISOString().slice(0, 10) === dateFilter;
      })
      .filter((session) => {
        if (!search.trim()) return true;
        const query = search.toLowerCase();
        return (
          (session.topic ?? '').toLowerCase().includes(query) ||
          (session.courseName ?? '').toLowerCase().includes(query) ||
          (session.classroomName ?? '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const aDate = parseSessionDateTime(a, 'startTime');
        const bDate = parseSessionDateTime(b, 'startTime');
        return (bDate?.getTime() ?? 0) - (aDate?.getTime() ?? 0);
      });
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
                placeholder="Search session or course"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter sessions by date"
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/10"
            />
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
                  className={`rounded-2xl border p-5 bg-white shadow-sm transition-all hover:shadow-md ${
                    isToday ? 'border-primary/40 ring-2 ring-primary/10' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{session.topic || session.courseName}</h3>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                        {session.courseName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <span>{startDate ? startDate.toLocaleDateString() : 'Unknown date'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>
                        {startDate ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown'} - 
                        {endDate ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{session.classroomName || session.classroomId}</span>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100 mt-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-emerald-700">Present: {attendanceSummary[session.id]?.presentCount ?? 0}</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="font-semibold text-rose-700">Absent: {attendanceSummary[session.id]?.absentCount ?? 0}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                        session.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {session.status || 'scheduled'}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {session.status === 'active' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setLiveQrSessionId(session.id);
                              handleFetchQr(session.id);
                            }}
                            disabled={activeSessionOp === session.id}
                            className="rounded-xl border border-primary bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                          >
                            {activeSessionOp === session.id ? 'Loading QR…' : 'Show QR'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEndSession(session.id)}
                            disabled={activeSessionOp === session.id}
                            className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            End Session
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/faculty/attendance-summary/${session.id}`)}
                            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            Attendance List
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartSession(session.id)}
                            disabled={activeSessionOp === session.id}
                            className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                          >
                            {activeSessionOp === session.id ? 'Starting…' : 'Start Session'}
                          </button>
                          {session.status === 'ended' ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/faculty/attendance-summary/${session.id}`)}
                              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Attendance List
                            </button>
                          ) : null}
                        </>
                      )}
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