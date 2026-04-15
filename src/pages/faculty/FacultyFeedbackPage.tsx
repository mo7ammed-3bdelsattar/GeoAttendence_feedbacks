import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore.ts';
import { feedbackApi } from '../../services/api.ts';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { StarRatingDisplay } from '../../components/ui/StarRating.tsx';
import { toast } from 'react-hot-toast';
import { MessageSquare, Users, Star, TrendingUp } from 'lucide-react';

export function FacultyFeedbackPage() {
  const user = useAuthStore((s) => s.user);
  const [fetchingFeedback, setFetchingFeedback] = useState(true);
  const [result, setResult] = useState<{
    courses: Array<{
      courseId: string;
      courseName: string;
      courseCode: string;
      averageRating: number;
      feedbackCount: number;
      feedback: Array<{ id: string; rating: number; message?: string; createdAt?: string | null }>;
    }>;
    summary: { totalFeedbacks: number; overallAverage: number };
  } | null>(null);

  useEffect(() => {
    async function fetchFacultyFeedback() {
      if (!user?.id) return;
      setFetchingFeedback(true);
      try {
        const data = await feedbackApi.getFeedbackByFaculty(user.id);
        setResult(data);
      } catch {
        toast.error('Failed to load ratings');
      } finally {
        setFetchingFeedback(false);
      }
    }
    fetchFacultyFeedback();
  }, [user?.id]);

  return (
    <AppShell title="My Ratings">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Ratings</h1>
            <p className="text-gray-500">Review average ratings and anonymous messages for your courses.</p>
          </div>
        </div>

        {fetchingFeedback ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            <div className="h-40 bg-gray-100 rounded-2xl"></div>
            <div className="h-40 bg-gray-100 rounded-2xl"></div>
            <div className="h-40 bg-gray-100 rounded-2xl"></div>
          </div>
        ) : result ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Average Rating</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{result.summary.overallAverage}</span>
                    <StarRatingDisplay value={result.summary.overallAverage} size="sm" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Feedbacks</p>
                  <span className="text-2xl font-bold text-gray-900">{result.summary.totalFeedbacks}</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 sm:col-span-2 lg:col-span-1">
                <div className="h-12 w-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                  <Star className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Satisfaction Rate</p>
                  <span className="text-2xl font-bold text-gray-900">
                    {result.summary.totalFeedbacks > 0
                      ? (Math.min(100, (result.summary.overallAverage / 5) * 100)).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {result.courses.map((course) => (
                <div key={course.courseId} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{course.courseCode}: {course.courseName}</h3>
                      <p className="text-xs text-gray-500">{course.feedbackCount} feedback item(s)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{course.averageRating.toFixed(1)} / 5</span>
                      <StarRatingDisplay value={course.averageRating} size="sm" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {course.feedback.length > 0 ? (
                      course.feedback.map((item) => (
                        <div key={item.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="flex items-center justify-between gap-3">
                            <StarRatingDisplay value={item.rating} size="sm" />
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                              Anonymous
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-2">{item.message || 'No message provided.'}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No feedback for this course yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No feedback found for this course</h3>
            <p className="text-gray-500">Encourage your students to submit their evaluations.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
