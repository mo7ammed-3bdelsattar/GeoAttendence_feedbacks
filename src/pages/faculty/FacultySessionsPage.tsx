import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { DataTable, type Column } from '../../components/ui/DataTable.tsx';
import { sessionApi } from '../../services/api.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import type { Session } from '../../types/session.ts';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.tsx';

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

  return (
    <AppShell title="Sessions">
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <form onSubmit={handleQuickAdd} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Name *
              </label>
              <input
                type="text"
                value={quickSession.topic}
                onChange={(e) => setQuickSession({ ...quickSession, topic: e.target.value })}
                placeholder="e.g., Introduction to React"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                value={quickSession.startTime}
                onChange={(e) => setQuickSession({ ...quickSession, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                value={quickSession.classroomId}
                onChange={(e) => setQuickSession({ ...quickSession, classroomId: e.target.value })}
                placeholder="e.g., Room 101, Online"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div className="flex-shrink-0">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="h-5 w-5" />
                Add Session
              </button>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">My Sessions</h2>
          <span className="text-sm text-gray-500">{sessions.length} sessions</span>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
            {error}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {isEditing ? 'Edit Session' : 'Create New Session'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic *
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formData.classroomId}
                    onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {isEditing ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setIsEditing(false);
                      setSelectedSession(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No sessions found. Add your first session above!</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={sessions}
            keyExtractor={(row) => row.id}
            pageSize={10}
            searchPlaceholder="Search sessions..."
          />
        )}
      </div>
    </AppShell>
  );
}