import { AppShell } from '../../components/layout/AppShell.tsx';
import { DataTable, type Column } from '../../components/ui/DataTable.tsx';
import { sessionApi } from '../../services/api.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import type { Session } from '../../types/session.ts';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [quickSession, setQuickSession] = useState({
    topic: '',
    startTime: '',
    endTime: '',
    classroomId: '',
    courseId: ''
  });

  const [formData, setFormData] = useState({
    topic: '',
    startTime: '',
    endTime: '',
    classroomId: '',
    courseId: ''
  });

  // Load sessions from localStorage when component mounts or user changes
  useEffect(() => {
    loadSessionsFromStorage();
  }, [user?.id]);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0 || !isLoading) {
      saveSessionsToStorage();
    }
  }, [sessions]);

  const loadSessionsFromStorage = async () => {
    setIsLoading(true);
    try {
      // Try to load from localStorage first
      const storageKey = `sessions_${user?.id}`;
      const storedSessions = localStorage.getItem(storageKey);

      if (storedSessions && storedSessions.length > 0) {
        const parsedSessions = JSON.parse(storedSessions);
        setSessions(parsedSessions);
        console.log('Loaded sessions from localStorage:', parsedSessions.length);
      }

      // Then try to fetch from API and merge
      try {
        const data = await sessionApi.getSessions({
          facultyId: user?.id
        });

        if (data && data.length > 0) {
          // Merge API data with local data, avoid duplicates
          const mergedSessions = [...data];
          if (storedSessions) {
            const localSessions = JSON.parse(storedSessions);
            localSessions.forEach((localSession: Session) => {
              if (!data.some(apiSession => apiSession.id === localSession.id)) {
                mergedSessions.push(localSession);
              }
            });
          }
          setSessions(mergedSessions);
          console.log('Merged with API data:', mergedSessions.length);
        }
      } catch (apiErr) {
        console.warn('API fetch failed, using localStorage only:', apiErr);
      }

    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSessionsToStorage = () => {
    if (user?.id && sessions.length > 0) {
      const storageKey = `sessions_${user?.id}`;
      localStorage.setItem(storageKey, JSON.stringify(sessions));
      console.log('Saved sessions to localStorage:', sessions.length);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quickSession.topic.trim()) {
      toast.error('Please enter session name');
      return;
    }
    if (!quickSession.startTime) {
      toast.error('Please select date and time');
      return;
    }
    if (!quickSession.classroomId.trim()) {
      toast.error('Please enter location');
      return;
    }

    let endTimeValue = quickSession.endTime;
    if (!endTimeValue && quickSession.startTime) {
      const startDate = new Date(quickSession.startTime);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      endTimeValue = endDate.toISOString();
    }

    const newSession: Session = {
      id: Date.now().toString(),
      topic: quickSession.topic,
      startTime: new Date(quickSession.startTime).toISOString(),
      endTime: endTimeValue,
      classroomId: quickSession.classroomId,
      classroomName: quickSession.classroomId,
      courseId: quickSession.courseId || 'course-001',
      courseName: quickSession.topic,
      facultyId: user?.id || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSessions(prevSessions => [newSession, ...prevSessions]);

    setQuickSession({
      topic: '',
      startTime: '',
      endTime: '',
      classroomId: '',
      courseId: ''
    });

    toast.success('Session added successfully');

    // Try to save to API in background
    try {
      const sessionData = {
        topic: quickSession.topic,
        startTime: new Date(quickSession.startTime).toISOString(),
        endTime: endTimeValue,
        classroomId: quickSession.classroomId,
        courseId: quickSession.courseId || 'course-001',
        facultyId: user?.id
      };
      await sessionApi.createSession(sessionData);
      console.log('Saved to API successfully');
    } catch (err) {
      console.warn('Background API save failed:', err);
    }
  };

  const handleEdit = (session: Session) => {
    setSelectedSession(session);
    const startDate = new Date(session.startTime);
    const endDate = new Date(session.endTime);

    setFormData({
      topic: session.topic || '',
      startTime: startDate.toISOString().slice(0, 16),
      endTime: endDate.toISOString().slice(0, 16),
      classroomId: session.classroomId || '',
      courseId: session.courseId || ''
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleUpdate = async () => {
    if (!selectedSession) return;

    const updatedSession = {
      ...selectedSession,
      topic: formData.topic,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      classroomId: formData.classroomId,
      classroomName: formData.classroomId,
      updatedAt: new Date().toISOString()
    };

    setSessions(prevSessions =>
      prevSessions.map(s => s.id === selectedSession.id ? updatedSession : s)
    );

    setShowForm(false);
    setIsEditing(false);
    setSelectedSession(null);
    setFormData({
      topic: '',
      startTime: '',
      endTime: '',
      classroomId: '',
      courseId: ''
    });
    toast.success('Session updated successfully');

    try {
      await sessionApi.updateSession(selectedSession.id, {
        topic: formData.topic,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        classroomId: formData.classroomId,
        courseId: formData.courseId,
        facultyId: user?.id
      });
    } catch (err) {
      console.warn('Background API update failed:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      await handleUpdate();
    } else {
      try {
        const newSession = await sessionApi.createSession({
          ...formData,
          facultyId: user?.id,
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString()
        });
        setSessions([...sessions, newSession]);
        setFormData({
          topic: '',
          startTime: '',
          endTime: '',
          classroomId: '',
          courseId: ''
        });
        setShowForm(false);
        toast.success('Session created successfully');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create session');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;

    setSessions(prevSessions => prevSessions.filter(s => s.id !== id));
    toast.success('Session deleted successfully');

    try {
      await sessionApi.deleteSession(id);
    } catch (err) {
      console.warn('Background API delete failed:', err);
    }
  };

  // Clear all sessions for current user (optional - for logout)
  const clearUserSessions = () => {
    const storageKey = `sessions_${user?.id}`;
    localStorage.removeItem(storageKey);
  };

  const columns: Column<Session>[] = [
    {
      id: 'topic',
      header: 'Session Name',
      accessor: (row) => row.topic || '-',
      sortable: true
    },
    {
      id: 'startTime',
      header: 'Date & Time',
      accessor: (row) => new Date(row.startTime).toLocaleString(),
      sortable: true
    },
    {
      id: 'classroomName',
      header: 'Location',
      accessor: (row) => row.classroomName || row.classroomId || '-',
      sortable: true
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.status === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
          }`}>
          {row.status}
        </span>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <AppShell title="Sessions">
        <LoadingSkeleton />
      </AppShell>
    );
  }

  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [attendanceSummary, setAttendanceSummary] = useState<Record<string, { presentCount: number; absentCount: number }>>({});

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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
>>>>>>> origin/geo
}