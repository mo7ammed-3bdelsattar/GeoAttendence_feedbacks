import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore.ts';
import { reportApi } from '../../services/api.ts';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { toast } from 'react-hot-toast';
import { Users, Star, BarChart3, GraduationCap } from 'lucide-react';

export function FacultyReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadReport();
    }
  }, [user?.id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const report = await reportApi.getInstructorReport(user!.id);
      setData(report);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Group Analytics">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Group Performance Reports</h1>
          <p className="text-gray-500">Analytics and attendance rates for your assigned groups.</p>
        </div>

        {loading ? (
          <div className="text-center py-20">Loading analytics...</div>
        ) : !data || data.groups.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed">
            <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No groups found. Please contact admin if this is an error.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.groups.map((group: any) => (
              <div key={group.groupId} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{group.groupName}</h3>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Group ID: {group.groupId}</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Star className="h-4 w-4 text-amber-500" />
                      Avg Feedback
                    </div>
                    <span className="font-bold text-gray-900">{group.averageRating} / 5</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      Attendance Rate
                    </div>
                    <span className={`font-bold ${group.attendanceRate > 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {group.attendanceRate}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <GraduationCap className="h-4 w-4 text-indigo-500" />
                      Students
                    </div>
                    <span className="font-bold text-gray-900">{group.studentCount}</span>
                  </div>

                  <div className="pt-4 border-t border-gray-50">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${group.attendanceRate > 75 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                        style={{ width: `${group.attendanceRate}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 text-center uppercase font-bold">
                      Based on {group.sessionCount} sessions
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
