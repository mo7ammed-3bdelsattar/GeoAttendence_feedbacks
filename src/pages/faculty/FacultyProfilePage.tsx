import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.ts';
import { authApi, feedbackApi } from '../../services/api.ts';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { StarRatingDisplay } from '../../components/ui/StarRating.tsx';
import { toast } from 'react-hot-toast';
import { MessageSquare, Users, Star, TrendingUp, Camera, Loader2, Trash2, User, LogOut } from 'lucide-react';
import { compressImage } from '../../utils/image.ts';

export function FacultyProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateUserAvatar = useAuthStore((s) => s.updateUserAvatar);
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploading(true);

    try {
      const base64Image = await compressImage(file);
      await authApi.updateAvatar(user.id, base64Image);
      
      updateUserAvatar(base64Image);
      toast.success('Profile picture updated successfully');
    } catch (error: any) {
      console.error('Upload Error:', error);
      toast.error(error.message || 'Failed to update profile picture');
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user) return;
    try {
      setIsUploading(true);
      await authApi.updateAvatar(user.id, "");
      updateUserAvatar("");
      toast.success('Profile picture removed');
      setIsUploading(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove profile picture');
      setIsUploading(false);
    }
  };

  if (!user) return null;

  return (
    <AppShell title="Profile">
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
        
        <div className="space-y-6 max-w-lg">
          <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-4">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                {previewUrl || user.avatar ? (
                  <img src={previewUrl || user.avatar} alt={user.name} className={`w-full h-full object-cover ${isUploading ? 'opacity-50' : ''}`} />
                ) : (
                  <User className="h-8 w-8 text-primary" />
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">{user.name}</h2>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                Faculty Member
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {user.avatar && !isUploading && !previewUrl && (
                <button 
                  type="button"
                  onClick={handleDeleteAvatar}
                  className="bg-danger/10 text-danger p-2 rounded-lg hover:bg-danger hover:text-white transition-colors"
                  title="Remove picture"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-primary/10 text-primary p-2 rounded-lg hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                title="Update picture"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-danger text-danger px-4 py-3 font-medium hover:bg-danger/5 transition-colors duration-200"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">My Ratings</h2>
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
      </div>
    </AppShell>
  );
}
