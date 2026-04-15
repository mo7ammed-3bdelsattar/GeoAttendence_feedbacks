import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Edit2, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { DataTable, type Column } from '../../components/ui/DataTable.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { adminApi, attendanceApi, sessionApi } from '../../services/api.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import type { Session } from '../../types/index.ts';

export function FacultySessionsPage() {
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [attendanceSummary, setAttendanceSummary] = useState<Record<string, { presentCount: number; absentCount: number }>>({});
  
  // Form states for creating/editing
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState({
    topic: '',
    startTime: '',
    endTime: '',
    classroomId: '',
    courseId: ''
  });

  const fetchData = async () => {
    if (!user?.id) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // First try to get sessions specifically for this faculty
      const sessionData = await sessionApi.getSessions({ facultyId: user.id });
      const courseData = await adminApi.getCourses();
      const classroomData = await adminApi.getClassrooms();

      const mapped = sessionData.map((session) => {
        const course = courseData.find((item) => item.id === session.courseId);
        const classroom = classroomData.find((item) => item.id === session.classroomId);
        return {
          ...session,
          courseName: course?.name ?? session.courseName ?? 'Unknown Course',
          courseCode: course?.code ?? 'N/A',
          classroomName: classroom?.name ?? session.classroomName ?? 'Unknown Classroom'
        };
      });

      setSessions(mapped);
      
      // Try to get attendance summary
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

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const today = new Date().toISOString().slice(0, 10);

  const filteredSessions = useMemo(() => {
    return sessions
      .filter((session) => {
        if (!dateFilter) return true;
        const sessionDate = new Date(session.startTime).toISOString().slice(0, 10);
        return sessionDate === dateFilter;
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
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [sessions, dateFilter, search]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    try {
      await sessionApi.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    }
  };

  const handleEdit = (session: Session) => {
    setSelectedSession(session);
    setFormData({
      topic: session.topic || '',
      startTime: new Date(session.startTime).toISOString().slice(0, 16),
      endTime: new Date(session.endTime).toISOString().slice(0, 16),
      classroomId: session.classroomId || '',
      courseId: session.courseId || ''
    });
    setIsEditing(true);
    setShowForm(true);
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
              const sessionDate = new Date(session.startTime).toISOString().slice(0, 10);
              const isToday = sessionDate === today;
              
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
                    <button onClick={() => handleDelete(session.id)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>{new Date(session.startTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>
                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                        {session.status}
                      </span>
                    </div>
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