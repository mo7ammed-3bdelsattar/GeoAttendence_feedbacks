import { useState, useEffect } from 'react';
import { Users, BookOpen, MapPin } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { StatCard } from '../../components/ui/StatCard.tsx';
import { LoadingSkeleton, CardSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { adminApi } from '../../services/api.ts';
import { format } from 'date-fns';

export function AdminOverviewPage() {
  const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUsers().then((u) => setUsers(u.map((x) => ({ id: x.id, name: x.name, role: x.role })))).finally(() => setLoading(false));
  }, []);

  const studentCount = users.filter((u) => u.role === 'student').length;
  const facultyCount = users.filter((u) => u.role === 'faculty').length;

  if (loading) {
    return (
      <AppShell title="Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <LoadingSkeleton className="h-48 w-full rounded-lg" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Overview">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Students" value={studentCount} />
        <StatCard icon={Users} label="Faculty" value={facultyCount} />
        <StatCard icon={BookOpen} label="Courses" value={5} />
        <StatCard icon={MapPin} label="Classrooms" value={5} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Firebase usage</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Storage</span>
              <span>45%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-[45%] bg-primary rounded-full" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Auth</span>
              <span>12%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-[12%] bg-secondary rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Activity log</h3>
        <ul className="space-y-2">
          {[
            { action: 'Session created', time: new Date(), user: 'Dr. Foster' },
            { action: 'User login', time: new Date(), user: 'Alice' },
            { action: 'Report exported', time: new Date(), user: 'Admin' },
          ].map((log, i) => (
            <li key={i} className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-200 bg-white text-sm">
              <span className="text-gray-900">{log.action}</span>
              <span className="text-gray-500">{format(log.time, 'MMM d, HH:mm')} – {log.user}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
