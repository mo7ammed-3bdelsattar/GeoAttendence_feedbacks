import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, MapPin, Navigation, CheckCircle2 } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { attendanceApi, sessionApi } from '../../services/api.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import type { Session } from '../../types/index.ts';
import toast from 'react-hot-toast';

export function StudentSessionsPage() {
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSessionOp, setActiveSessionOp] = useState<string | null>(null);
  const [checkedInSessions, setCheckedInSessions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const rows = await sessionApi.getStudentSessions(user.id);
        setSessions(rows ?? []);
      } catch {
        toast.error('Failed to load sessions.');
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [user?.id]);

  const handleStudentCheckIn = async (session: Session) => {
    if (!user?.id) return;
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return;
    }

    const qrToken = window.prompt('Paste the active session QR token from the instructor.');
    if (!qrToken) return;

    setActiveSessionOp(session.id);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await attendanceApi.markAttendanceSmart({
            studentId: user.id,
            sessionId: session.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            qrToken,
          });
          setCheckedInSessions((prev) => ({ ...prev, [session.id]: true }));
          setSessions((prev) => prev.map((row) => (row.id === session.id ? { ...row, attended: true } : row)));
          toast.success('Checked in successfully. You may check out later.');
        } catch (error: any) {
          toast.error(error?.response?.data?.message || 'Unable to check in.');
        } finally {
          setActiveSessionOp(null);
        }
      },
      (err) => {
        console.error(err);
        setActiveSessionOp(null);
        toast.error('Unable to retrieve your location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleStudentCheckout = async (session: Session) => {
    if (!user?.id) return;
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return;
    }

    const qrToken = window.prompt('Paste the active session QR token again to check out.');
    if (!qrToken) return;

    setActiveSessionOp(session.id);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await attendanceApi.studentCheckout({
            qrToken,
            gpsCoords: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
          });
          setCheckedInSessions((prev) => ({ ...prev, [session.id]: false }));
          toast.success('Checked out successfully.');
        } catch (error: any) {
          toast.error(error?.response?.data?.message || 'Unable to check out.');
        } finally {
          setActiveSessionOp(null);
        }
      },
      () => {
        setActiveSessionOp(null);
        toast.error('Unable to retrieve your location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    [sessions]
  );

  return (
    <AppShell title="Personal Timetable">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">Check in and check out with the instructor's live QR code when sessions are active.</p>
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : sortedSessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-500">
            No sessions available.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedSessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{session.courseName}</h3>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">{session.courseCode}</p>
                  </div>
                  {session.attended ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Attended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-600">
                      Pending
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {new Date(session.date).toLocaleDateString()}</div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {session.startTime} - {session.endTime}</div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {session.classroomName}</div>
                </div>

                {session.status === 'active' ? (
                  <div className="mt-4 grid gap-3">
                    {!session.attended && !checkedInSessions[session.id] ? (
                      <button
                        type="button"
                        onClick={() => handleStudentCheckIn(session)}
                        disabled={activeSessionOp === session.id}
                        className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                      >
                        <Navigation className="h-4 w-4" />
                        {activeSessionOp === session.id ? 'Checking in…' : 'Scan QR to Check In'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStudentCheckout(session)}
                        disabled={activeSessionOp === session.id}
                        className="w-full h-11 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                      >
                        <Navigation className="h-4 w-4" />
                        {activeSessionOp === session.id ? 'Checking out…' : 'Scan QR to Check Out'}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-4 w-full h-11 rounded-xl bg-gray-200 text-gray-500 text-sm font-semibold inline-flex items-center justify-center gap-2"
                  >
                    <Navigation className="h-4 w-4" />
                    Session not started yet
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
