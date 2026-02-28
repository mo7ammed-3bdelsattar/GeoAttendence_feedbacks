import { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, ShieldCheck, Activity, Database, Server } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { StatCard } from '../../components/ui/StatCard.tsx';
import { adminApi } from '../../services/api.ts';
import type { User } from '../../types/index.ts';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function AdminOverviewPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'Checking...' | 'Live' | 'Config Error'>('Checking...');

  useEffect(() => {
    adminApi.getUsers()
      .then(u => {
        setUsers(u || []);
        setDbStatus('Live');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Diagnostic Report:', err.response?.data?.error || err.message);
        setDbStatus('Config Error');
        setLoading(false);
      });
  }, []);

  const stats = {
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    faculty: users.filter(u => u.role === 'faculty').length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  const chartData = [
    { name: 'Students', count: stats.students },
    { name: 'Faculty', count: stats.faculty },
    { name: 'Admin', count: stats.admins },
  ];

  return (
    <AppShell title="Overview Dashboard">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${dbStatus === 'Live' ? 'bg-emerald-50 text-emerald-700' : dbStatus === 'Config Error' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'}`}>
              <Database className="h-4 w-4" />
              <span className="text-sm font-semibold">Firestore: {dbStatus}</span>
           </div>
           <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg text-blue-700">
              <Server className="h-4 w-4" />
              <span className="text-sm font-semibold">Gateway: Active (Port 5000)</span>
           </div>
           <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 rounded-lg ml-auto text-violet-700">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-semibold">Uptime: 99.9%</span>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total Database Users"
            value={loading ? '...' : stats.total}
            className="border-primary/20 bg-blue-50/50"
          />
          <StatCard
            icon={GraduationCap}
            label="Active Students"
            value={loading ? '...' : stats.students}
          />
          <StatCard
            icon={BookOpen}
            label="Verified Faculty"
            value={loading ? '...' : stats.faculty}
          />
          <StatCard
            icon={ShieldCheck}
            label="System Admins"
            value={loading ? '...' : stats.admins}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-md font-bold text-gray-800 mb-6 flex items-center gap-2">
                 User Distribution
                 <span className="text-xs font-medium text-gray-400">Live Data</span>
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                    <Tooltip 
                       contentStyle={{background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                       cursor={{stroke: '#1e3a8a', strokeWidth: 1}}
                    />
                    <Area type="monotone" dataKey="count" stroke="#1e3a8a" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-md font-bold text-gray-800 mb-4">Quick Links</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">Manage your system directly.</p>
              
              <div className="space-y-3">
                 {[
                   {label: 'Manage Database Users', path: '/admin/users', desc: 'Add, edit, or remove users from the system.'},
                   {label: 'Sign Up New Entry', path: '/admin/users/signup', desc: 'Manually register a student or faculty account.'},
                   {label: 'System Health Logs', path: '#', desc: 'Coming soon - View real-time API logs.'}
                 ].map((link, i) => (
                   <a 
                     key={i} 
                     href={link.path}
                     className="block p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-primary/30 transition-all group"
                   >
                     <p className="font-semibold text-gray-900 group-hover:text-primary">{link.label}</p>
                     <p className="text-xs text-gray-500 mt-1">{link.desc}</p>
                   </a>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </AppShell>
  );
}
