import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { DataTable, type Column } from '../../components/ui/DataTable.tsx';
import { sessionApi } from '../../services/api.ts';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import type { Session } from '../../types/session.ts';

export function StudentHomePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await sessionApi.getSessions();
        setSessions(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load sessions';
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const columns: Column<Session>[] = [
    {
      id: 'courseName',
      header: 'Course',
      accessor: (row) => row.courseName || '-',
      sortable: true
    },
    {
      id: 'topic',
      header: 'Topic',
      accessor: (row) => row.topic || '-',
      sortable: true
    },
    {
      id: 'classroomName',
      header: 'Classroom',
      accessor: (row) => row.classroomName || '-',
      sortable: true
    },
    {
      id: 'startTime',
      header: 'Start Time',
      accessor: (row) => new Date(row.startTime).toLocaleString(),
      sortable: true
    },
    {
      id: 'endTime',
      header: 'End Time',
      accessor: (row) => new Date(row.endTime).toLocaleString(),
      sortable: true
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  if (isLoading) {
    return (
      <AppShell title="Home">
        <LoadingSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell title="Home">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Available Sessions</h2>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-800">
            {error}
          </div>
        )}
        
        {sessions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No sessions available</p>
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


