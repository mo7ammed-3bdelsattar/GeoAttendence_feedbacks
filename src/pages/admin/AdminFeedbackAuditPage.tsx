import { useState, useEffect } from 'react';
import { adminApi, feedbackApi } from '../../services/api.ts';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { StarRatingDisplay } from '../../components/ui/StarRating.tsx';
import type { Course } from '../../types/course.ts';
import { toast } from 'react-hot-toast';
import { Shield, Filter, Trash2 } from 'lucide-react';
import type { Feedback } from '../../types/feedback.ts';


export function AdminFeedbackAuditPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [fetchingFeedback, setFetchingFeedback] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const data = await adminApi.getCourses();
        setCourses(data);
        if (data.length > 0) {
          setSelectedCourseId(data[0].id);
        }
      } catch (error) {
        toast.error('Failed to load courses');
      } finally {
        // loading finished
      }
    }
    fetchCourses();
  }, []);

  useEffect(() => {
    async function fetchAuditData() {
      if (!selectedCourseId) return;
      setFetchingFeedback(true);
      try {
        const data = await feedbackApi.getFeedbackByCourse(selectedCourseId);
        setFeedback(data);
      } catch {
        toast.error('Failed to load audit feedback');
      } finally {
        setFetchingFeedback(false);
      }
    }
    fetchAuditData();
  }, [selectedCourseId]);

  const averageRating = feedback.length > 0
    ? (feedback.reduce((sum, item) => sum + Number(item.rating || 0), 0) / feedback.length)
    : 0;

  const handleDeleteFeedback = async (feedbackId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this feedback item?');
    if (!confirmed) return;

    setDeletingId(feedbackId);
    const previousFeedback = feedback;
    setFeedback((prev) => prev.filter((item) => item.id !== feedbackId));

    try {
      await feedbackApi.deleteFeedback(feedbackId);
      toast.success('Feedback deleted successfully');
    } catch {
      setFeedback(previousFeedback);
      toast.error('Failed to delete feedback');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell title="Course Feedback">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Course Feedback Insights</h1>
              <p className="text-gray-500 text-sm">Review ratings and messages by course.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-widest">Average</p>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xl font-bold text-gray-900">{averageRating.toFixed(1)} / 5</span>
              <StarRatingDisplay value={averageRating} size="sm" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Filters Bar */}
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center gap-4 bg-gray-50/30">
             <div className="w-full sm:w-64">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Select Course</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-gray-200 bg-white focus:border-rose-300 focus:ring-rose-300 transition-all font-medium text-gray-900 shadow-sm"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}: {c.name}
                    </option>
                  ))}
                </select>
             </div>
             <div className="sm:ml-auto text-sm text-gray-500">{feedback.length} feedback item(s)</div>
          </div>

          {/* Audit Table */}
          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                   <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Score</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Rating</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Message</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date Submitted</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {fetchingFeedback ? (
                      Array.from({ length: 5 }).map((_, i) => (
                         <tr key={i} className="animate-pulse">
                            <td className="px-6 py-4"><div className="h-6 w-24 bg-gray-100 rounded-lg"></div></td>
                            <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-100 rounded-lg mx-auto"></div></td>
                            <td className="px-6 py-4"><div className="h-6 w-full bg-gray-100 rounded-lg"></div></td>
                            <td className="px-6 py-4"><div className="h-6 w-20 bg-gray-100 rounded-lg"></div></td>
                         </tr>
                      ))
                   ) : feedback.length > 0 ? (
                      feedback.map((f) => (
                         <tr key={f.id} className="hover:bg-gray-50/50 transition-all">
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-900">{Number(f.rating).toFixed(1)} / 5</span>
                            </td>
                            <td className="px-6 py-4 flex justify-center">
                               <StarRatingDisplay value={f.rating} size="sm" />
                            </td>
                            <td className="px-6 py-4">
                               <p className="text-gray-600 text-sm max-w-sm line-clamp-2">{f.message || '(No message provided)'}</p>
                            </td>
                            <td className="px-6 py-4">
                               <p className="text-gray-500 text-xs font-medium">{new Date(f.createdAt).toLocaleDateString()}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteFeedback(f.id)}
                                disabled={deletingId === f.id}
                                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingId === f.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </td>
                         </tr>
                      ))
                   ) : (
                      <tr>
                         <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                            <div className="flex flex-col items-center">
                               <Filter className="h-12 w-12 text-gray-200 mb-2" />
                               <p className="text-lg font-medium">No feedback audit records found for this course.</p>
                            </div>
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
