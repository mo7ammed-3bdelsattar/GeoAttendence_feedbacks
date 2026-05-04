import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Search, Plus, BookOpen, Users, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { attendanceApi, sessionApi, adminApi, groupApi } from '../../services/api.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import type { Session, Course, Classroom } from '../../types/index.ts';
import { Modal } from '../../components/Modal/index.ts';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { FormSelect } from '../../components/forms/FormSelect.tsx';

export function FacultySessionsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [attendanceSummary, setAttendanceSummary] = useState<Record<string, { presentCount: number; absentCount: number }>>({});
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);

  // Form State
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [sessionData, allCourses, allClassrooms, allGroups] = await Promise.all([
        sessionApi.getSessionsForFaculty(user.id),
        adminApi.getCourses(),
        adminApi.getClassrooms(),
        groupApi.getGroups()
      ]);

      const mapped = sessionData.map((session: any) => ({
        ...session,
        courseName:    session.course?.name      ?? session.courseName    ?? 'Unknown Course',
        courseCode:    session.course?.code      ?? session.courseCode    ?? 'N/A',
        classroomName: session.classroom?.name   ?? session.classroomName ?? 'Unknown Classroom',
      }));
      setSessions(mapped);
      
      // Filter data relevant to this instructor
      setCourses(allCourses.filter(c => c.facultyId === user.id));
      setClassrooms(allClassrooms);
      setGroups(allGroups.filter(g => g.facultyId === user.id || g.instructorId === user.id));

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
      toast.error('Failed to load your sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const resetForm = () => {
    setSelectedCourse('');
    setSelectedGroup('');
    setSelectedRoom('');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('09:00');
    setEndTime('11:00');
    setTopic('');
  };

  const handleCreateSession = async () => {
    if (!selectedCourse || !selectedRoom || !date || !startTime || !endTime) {
      toast.error('Please complete all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await sessionApi.createSession({
        courseId: selectedCourse,
        groupId: selectedGroup || undefined,
        facultyId: user?.id,
        classroomId: selectedRoom,
        date,
        startTime,
        endTime,
        topic
      });
      toast.success('Session scheduled successfully.');
      setAddOpen(false);
      resetForm();
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to schedule session.');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

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

  const getStatusUi = (status?: string) => {
    const normalized = (status || 'UPCOMING').toUpperCase();
    if (normalized === 'ACTIVE') return { label: 'Active', className: 'bg-emerald-100 text-emerald-700' };
    if (normalized === 'ENDED') return { label: 'Ended', className: 'bg-gray-200 text-gray-700' };
    return { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' };
  };

  const filteredSessions = useMemo(() => {
    return sessions
      .filter((session) => {
        if (dateFilter && session.date !== dateFilter) return false;
        if (!search.trim()) return true;
        const query = search.toLowerCase();
        return (
          (session.topic ?? '').toLowerCase().includes(query) ||
          (session.courseName ?? '').toLowerCase().includes(query) ||
          (session.classroomName ?? '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [sessions, dateFilter, search]);

  return (
    <AppShell title="My Sessions">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Sessions</h1>
            <p className="text-sm text-gray-500 mt-1">View and track your scheduled classes.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button 
              onClick={() => setAddOpen(true)}
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/10"
            >
              <Plus className="h-4 w-4" />
              Schedule Session
            </button>
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
            <p className="text-gray-500">No sessions found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSessions.map((session) => {
              const statusUi = getStatusUi(session.status);
              const isActive = session.status?.toUpperCase() === 'ACTIVE';
              const isEnded = session.status?.toUpperCase() === 'ENDED';
              const isToday = session.date === today;

              return (
                <div key={session.id} className={`rounded-2xl border p-5 bg-white shadow-sm transition-all hover:shadow-md ${isToday ? 'border-primary/40 ring-2 ring-primary/10' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{session.topic || session.courseName}</h3>
                      <p className="text-xs text-gray-400 font-semibold uppercase">{session.courseName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       {isToday && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">Today</span>}
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusUi.className}`}>{statusUi.label}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>{session.date || 'No Date'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{session.startTime} - {session.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{session.classroomName}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between mb-4">
                    <div className="flex gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">Present</span>
                        <span className="text-sm font-bold text-emerald-600">{attendanceSummary[session.id]?.presentCount ?? 0}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">Absent</span>
                        <span className="text-sm font-bold text-rose-600">{attendanceSummary[session.id]?.absentCount ?? 0}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/faculty/attendance-summary/${session.id}`)}
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      View Details
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEnded && !isActive && (
                      <button
                        onClick={() => handleStartSession(session.id)}
                        disabled={processingSessionId === session.id}
                        className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {processingSessionId === session.id ? 'Starting...' : 'Start Session'}
                      </button>
                    )}
                    {isActive && (
                      <button
                        onClick={() => handleEndSession(session.id)}
                        disabled={processingSessionId === session.id}
                        className="flex-1 px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-bold hover:bg-gray-900 disabled:opacity-50"
                      >
                        {processingSessionId === session.id ? 'Ending...' : 'End Session'}
                      </button>
                    )}
                    {isEnded && (
                      <div className="flex-1 py-2 px-4 rounded-xl bg-gray-50 border border-gray-100 text-center text-xs text-gray-500 font-medium">
                        This session has ended.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      <Modal 
        isOpen={addOpen} 
        onClose={() => { setAddOpen(false); resetForm(); }}
        title="Schedule New Session"
        footer={
          <div className="flex gap-3 w-full">
             <button onClick={() => { setAddOpen(false); resetForm(); }} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all">Cancel</button>
             <button onClick={handleCreateSession} disabled={submitting} className="flex-2 px-8 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50">
               {submitting ? 'Scheduling...' : 'Confirm Schedule'}
             </button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
           <div className="grid grid-cols-2 gap-4">
              <FormSelect 
                label="Course"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                options={courses.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Select Course"
                fullWidth
              />
              <FormSelect 
                label="Student Group (Optional)"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                options={groups.filter(g => g.courseId === selectedCourse).map(g => ({ value: g.id, label: g.name }))}
                placeholder="Select Group"
                fullWidth
              />
           </div>

           <FormSelect 
              label="Classroom"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              options={classrooms.map(r => ({ value: r.id, label: r.name }))}
              placeholder="Select Room"
              fullWidth
           />

           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
              <FormInput 
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                fullWidth
              />
              <div className="grid grid-cols-2 gap-4">
                <FormInput 
                  label="Start Time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  fullWidth
                />
                <FormInput 
                  label="End Time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  fullWidth
                />
              </div>
           </div>

           <FormInput 
              label="Topic / Title"
              placeholder="e.g. Introduction to React Hooks"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              fullWidth
           />
           
           {startTime && endTime && startTime >= endTime && (
             <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-3 rounded-xl border border-rose-100">
                <AlertCircle className="h-4 w-4" />
                <p className="text-[10px] font-bold uppercase tracking-wider">End time must be after start time</p>
             </div>
           )}
        </div>
      </Modal>
    </AppShell>
  );
}