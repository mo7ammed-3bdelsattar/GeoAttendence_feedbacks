import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  Pencil, 
  Trash2, 
  Search,
  AlertCircle
} from 'lucide-react';

import { AppShell } from '../../components/layout/AppShell.tsx';
import { Modal } from '../../components/Modal/index.ts';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { FormSelect } from '../../components/forms/FormSelect.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { QuickCreateButton } from '../../components/ui/QuickCreateButton.tsx';
import { adminApi, sessionApi } from '../../services/api.ts';
import type { User, Course, Classroom } from '../../types/index.ts';
import toast from 'react-hot-toast';

interface Session {
  id: string;
  courseId: string;
  facultyId: string;
  classroomId: string;
  date: string;
  startTime: string;
  endTime: string;
  title?: string;
  status: 'active' | 'ended';
  // Joined fields for display
  courseName?: string;
  courseCode?: string;
  facultyName?: string;
  classroomName?: string;
}

export function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form State
  const [addOpen, setAddOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, c, r, u] = await Promise.all([
        sessionApi.getSessions(),
        adminApi.getCourses(),
        adminApi.getClassrooms(),
        adminApi.getUsers('faculty')
      ]);

      // Map sessions to include names for display
      const mapped = s.map((sess: any) => {
        const crs = c?.find(x => x.id === sess.courseId);
        const fac = u?.find(x => x.id === sess.facultyId);
        const room = r?.find(x => x.id === sess.classroomId);
        return {
          ...sess,
          courseName: crs?.name || 'Unknown Course',
          courseCode: crs?.code || '???',
          facultyName: fac?.name || 'Unknown Instructor',
          classroomName: room?.name || 'Unknown Room'
        };
      });

      setSessions(mapped);
      setCourses(c ?? []);
      setClassrooms(r ?? []);
      setInstructors(u ?? []);
    } catch {
      toast.error('Failed to sync management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Filter instructors when course changes
  useEffect(() => {
    if (selectedCourse && !selectedFaculty) {
      const course = courses.find(c => c.id === selectedCourse);
      if (course?.facultyId) {
        setSelectedFaculty(course.facultyId);
      }
    }
  }, [selectedCourse]);

  const resetForm = () => {
    setSelectedCourse('');
    setSelectedFaculty('');
    setSelectedRoom('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setTitle('');
    setIsActive(false);
  };

  const handleSave = async () => {
    if (!selectedCourse || !selectedFaculty || !selectedRoom || !date || !startTime || !endTime) {
      toast.error('Please complete all required fields.');
      return;
    }
    setSubmitting(true);
    const payload = {
      courseId: selectedCourse,
      facultyId: selectedFaculty,
      classroomId: selectedRoom,
      date,
      startTime,
      endTime,
      title,
      isActive
    };

    try {
      if (editSession) {
        await sessionApi.updateSession(editSession.id, payload);
        toast.success('Session updated successfully.');
      } else {
        await sessionApi.createSession(payload);
        toast.success('Lecture session scheduled.');
      }
      setAddOpen(false);
      setEditSession(null);
      resetForm();
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to save session due to scheduling conflict.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (s: Session) => {
    setEditSession(s);
    setSelectedCourse(s.courseId);
    setSelectedFaculty(s.facultyId);
    setSelectedRoom(s.classroomId);
    setDate(s.date);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setTitle(s.title || '');
    setIsActive(s.isActive || s.status === 'active');
    setAddOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) return;
    try {
      await sessionApi.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success('Session cancelled.');
    } catch {
      toast.error('Cancellation failed.');
    }
  };

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(s => 
      s.courseName?.toLowerCase().includes(q) || 
      s.courseCode?.toLowerCase().includes(q) ||
      s.facultyName?.toLowerCase().includes(q) ||
      s.classroomName?.toLowerCase().includes(q) ||
      s.title?.toLowerCase().includes(q)
    );
  }, [sessions, search]);

  return (
    <AppShell title="Lecture Scheduling">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 text-left">Academic Sessions</h1>
            <p className="text-sm text-gray-500 mt-1 text-left">Schedule and manage lectures, labs, and exams.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search sessions..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border-gray-200 focus:ring-2 focus:ring-primary/10 transition-all text-sm outline-none bg-white shadow-sm"
                />
             </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           {[
             { label: 'Total Scheduled', count: sessions.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
             { label: 'Active Today', count: sessions.filter(s => s.date === new Date().toISOString().split('T')[0]).length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
             { label: 'Rooms Occupied', count: new Set(sessions.map(s => s.classroomId)).size, icon: MapPin, color: 'text-emerald-600', bg: 'bg-emerald-50' },
           ].map((stat, i) => (
             <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 transition-all hover:scale-[1.02]">
                <div className={`h-12 w-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                   <stat.icon className="h-6 w-6" />
                </div>
                <div>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                   <p className="text-xl font-bold text-gray-900">{stat.count}</p>
                </div>
             </div>
           ))}
        </div>

        {/* Table View */}
        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Lecture/Course</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Instructor</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Schedule</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                         No sessions found. Start by creating one.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <BookOpen className="h-5 w-5" />
                             </div>
                             <div>
                                <p className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{s.title || s.courseName}</p>
                                <p className="text-[10px] font-bold text-gray-400 tracking-wider">COURSE ID: {s.courseCode}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                              <div className="h-8 w-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                 {s.facultyName?.split(' ').map(n => n[0]).join('')}
                              </div>
                              <p className="text-sm font-medium text-gray-700">{s.facultyName}</p>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                 <Calendar className="h-3 w-3 text-primary" />
                                 {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                 <Clock className="h-3 w-3" />
                                 {s.startTime} - {s.endTime}
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${s.isActive || s.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
                              {s.isActive || s.status === 'active' ? 'Active' : 'Upcoming'}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold">
                              <MapPin className="h-3 w-3" />
                              {s.classroomName}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(s)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                                 <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                 <Trash2 className="h-4 w-4" />
                              </button>
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <QuickCreateButton label="Quick Create Session" onClick={() => setAddOpen(true)} />

        {/* Modal */}
        <Modal 
          isOpen={addOpen} 
          onClose={() => { setAddOpen(false); setEditSession(null); resetForm(); }}
          title={editSession ? 'Modify Academic Session' : 'Schedule New Lecture'}
          footer={
            <div className="flex gap-3 w-full">
               <button onClick={() => { setAddOpen(false); setEditSession(null); resetForm(); }} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all">Cancel</button>
               <button onClick={handleSave} disabled={submitting} className="flex-2 px-8 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50">
                 {submitting ? (editSession ? 'Updating...' : 'Scheduling...') : (editSession ? 'Apply Changes' : 'Confirm Schedule')}
               </button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
             <div className="grid grid-cols-2 gap-4">
                <FormSelect 
                  label="Academic Course"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  options={courses.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select Course"
                  fullWidth
                />
                <FormSelect 
                  label="Lecturer/Instructor"
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  options={instructors.map(u => ({ value: u.id, label: u.name }))}
                  placeholder="Select Instructor"
                  fullWidth
                />
             </div>

             <FormSelect 
                label="Assigned Classroom"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                options={classrooms.map(r => ({ value: r.id, label: r.name }))}
                placeholder="Select Room"
                fullWidth
             />

             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <FormInput 
                  label="Session Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  fullWidth
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormInput 
                    label="Begins At"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    fullWidth
                  />
                  <FormInput 
                    label="Ends At"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    fullWidth
                  />
                </div>
             </div>

             <FormInput 
                label="Session Title (Optional)"
                placeholder="e.g. Midterm Lab Section / Revision Lecture"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
             />

             <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/20"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-gray-700 cursor-pointer flex-1">
                   Mark as Active Session
                   <span className="block text-[10px] text-gray-400 font-medium mt-0.5">Students can only check-in if the session is active and today.</span>
                </label>
             </div>
             
             {/* Simple visual validation aid */}
             {startTime && endTime && startTime >= endTime && (
               <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-3 rounded-xl border border-rose-100">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">End time must be after start time</p>
               </div>
             )}
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
