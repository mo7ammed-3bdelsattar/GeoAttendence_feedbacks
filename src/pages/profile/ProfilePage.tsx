import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { LogOut, Mail, Shield, Upload, User, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { authApi } from '../../services/api.ts';
import { useAuthStore } from '../../stores/authStore.ts';

type ProfileSummary = Record<string, number>;

const roleLabelMap: Record<string, string> = {
  student: 'Student',
  faculty: 'Doctor',
  doctor: 'Doctor',
  admin: 'Admin'
};

function roleTitle(role?: string) {
  return roleLabelMap[String(role || '').toLowerCase()] ?? 'User';
}

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const uploadProfileImage = useAuthStore((s) => s.uploadProfileImage);
  const refreshCurrentUser = useAuthStore((s) => s.refreshCurrentUser);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [summary, setSummary] = useState<ProfileSummary>({});
  const [name, setName] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const data = await authApi.getProfile();
        setName(data.name);
        setSummary(data.summary ?? {});
        await refreshCurrentUser();
      } catch {
        toast.error('Failed to load profile.');
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfile();
  }, [refreshCurrentUser]);

  const role = String(user?.role || '').toLowerCase();

  const roleCards = useMemo(() => {
    if (role === 'faculty' || role === 'doctor') {
      return [
        { label: 'Courses', value: summary.courses ?? 0 },
        { label: 'Sessions', value: summary.sessions ?? 0 },
        { label: 'Students', value: summary.students ?? 0 }
      ];
    }
    if (role === 'admin') {
      return [
        { label: 'Users Management', value: summary.users ?? 0 },
        { label: 'Reports', value: summary.reports ?? 0 },
        { label: 'Statistics', value: summary.statistics ?? 0 }
      ];
    }
    return [
      { label: 'Attendance', value: summary.attendance ?? 0 },
      { label: 'Enrolled Courses', value: summary.enrolledCourses ?? 0 }
    ];
  }, [role, summary]);

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = new Set(['image/jpeg', 'image/png']);
    const maxSize = 2 * 1024 * 1024;
    if (!allowedTypes.has(file.type)) {
      toast.error('Only JPG or PNG files are allowed.');
      event.target.value = '';
      return;
    }
    if (file.size > maxSize) {
      toast.error('Image size must be 2MB or less.');
      event.target.value = '';
      return;
    }

    const loadingToast = toast.loading('Uploading profile image...');
    try {
      await uploadProfileImage(file);
      toast.success('Profile image updated.', { id: loadingToast });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image.', { id: loadingToast });
    } finally {
      event.target.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('Name is required.');
      return;
    }

    const loadingToast = toast.loading('Saving profile...');
    try {
      await updateProfile({ name: name.trim() });
      toast.success('Profile updated successfully.', { id: loadingToast });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile.', { id: loadingToast });
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <AppShell title="Profile">
      <div className="max-w-5xl mx-auto space-y-6">
        {loadingProfile ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-40 rounded-3xl bg-gray-100" />
            <div className="h-40 rounded-3xl bg-gray-100" />
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="relative group h-28 w-28 rounded-full border border-gray-200 overflow-hidden"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={`${user.name} avatar`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                      <User className="h-12 w-12 text-primary" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />

                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Role</p>
                    <p className="text-sm font-semibold text-primary mt-1">{roleTitle(role)}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Full Name</span>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/10"
                        placeholder="Full name"
                      />
                    </label>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Email</span>
                      <div className="mt-1 h-[42px] rounded-xl border border-gray-200 bg-gray-50 px-3 flex items-center gap-2 text-sm text-gray-700">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleSaveProfile}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                    >
                      <UserCog className="h-4 w-4" />
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-gray-900">Role Overview</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {roleCards.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
