import { type ChangeEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Upload } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { useAuthStore } from '../../stores/authStore.ts';
import toast from 'react-hot-toast';

export function StudentProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const uploadProfileImage = useAuthStore((s) => s.uploadProfileImage);
  const isLoading = useAuthStore((s) => s.isLoading);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const validateImage = (file: File) => {
    const maxSize = 2 * 1024 * 1024;
    const allowedTypes = new Set(['image/jpeg', 'image/png']);
    if (!allowedTypes.has(file.type)) {
      return 'Only JPG or PNG files are allowed.';
    }
    if (file.size > maxSize) {
      return 'Image size must be 2MB or less.';
    }
    return null;
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateImage(file);
    if (validationError) {
      toast.error(validationError);
      event.target.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const loadingToast = toast.loading('Uploading profile image...');
    try {
      await uploadProfileImage(file);
      toast.success('Profile image updated successfully.', { id: loadingToast });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload profile image.', { id: loadingToast });
    } finally {
      event.target.value = '';
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
      <div className="space-y-6 max-w-lg">
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-4">
          {previewUrl || user.avatar ? (
            <img
              src={previewUrl ?? user.avatar}
              alt={`${user.name} avatar`}
              className="w-14 h-14 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              Student
            </span>
          </div>


          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            Upload Profile Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleImageChange}
          />
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
    </AppShell>
  );
}
