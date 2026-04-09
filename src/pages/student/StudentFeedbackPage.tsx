import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.ts';
import { adminApi, feedbackApi } from '../../services/api.ts';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { StarRatingInput } from '../../components/ui/StarRating.tsx';
import type { Course } from '../../types/index.ts';
import { toast } from 'react-hot-toast';
import { MessageSquare, Send, CheckCircle } from 'lucide-react';

export function StudentFeedbackPage() {
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const data = await adminApi.getCourses();
        setCourses(data ?? []);
      } catch {
        toast.error('Failed to load courses');
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, []);

  useEffect(() => {
    const courseId = searchParams.get('courseId');
    if (courseId) {
      setSelectedCourseId(courseId);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCourseId || selectedCourseId === '' || rating === 0) {
      toast.error('Please select a course and provide a rating');
      return;
    }

    setSubmitting(true);
    try {
      await feedbackApi.submitFeedback({
        studentId: user.id,
        courseId: selectedCourseId,
        rating,
        message
      });
      toast.success('Feedback submitted successfully!');
      setSubmitted(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <AppShell title="Course Feedback">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in zoom-in duration-500">
          <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <CheckCircle className="h-12 w-12" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 max-w-md mb-8">
            Your feedback has been submitted anonymously to the instructor. Your input helps us improve the learning experience.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setRating(0);
              setMessage('');
              setSelectedCourseId('');
            }}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md"
          >
            Submit Another
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Course Feedback">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Course Evaluation</h1>
                <p className="text-gray-500 text-sm">Submit your anonymous feedback to your instructors.</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-gray-100 rounded-lg"></div>
                <div className="h-32 bg-gray-100 rounded-lg"></div>
                <div className="h-12 bg-gray-100 rounded-lg"></div>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No active courses found.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border-gray-200 bg-white focus:border-primary focus:ring-primary transition-all text-gray-900 shadow-sm font-medium"
                  >
                    <option value="" className="text-gray-500">Select a course...</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id} className="text-gray-900 bg-white">
                        {course.code}: {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  <StarRatingInput
                    label="Overall Experience"
                    value={rating}
                    onChange={setRating}
                    className="mb-6"
                  />
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Detailed Comments (Optional)</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Share your thoughts about the course material, instructor, or organization..."
                      className="w-full h-32 px-4 py-3 rounded-xl border-gray-200 bg-white focus:border-primary focus:ring-primary transition-all resize-none shadow-sm placeholder:text-gray-400"
                      maxLength={1000}
                    />
                    <div className="flex justify-end mt-1 text-xs text-gray-400">
                      {message.length}/1000
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || rating === 0}
                    className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:bg-gray-300 disabled:shadow-none transition-all active:scale-95"
                  >
                    {submitting ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Submit Feedback
                      </>
                    )}
                  </button>
                  <p className="text-center mt-4 text-xs text-gray-400 italic">
                    Feedback is shared anonymously with instructors.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
