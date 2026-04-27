import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Camera, Loader2, Trash2 } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { useAuthStore } from '../../stores/authStore.ts';
import toast from 'react-hot-toast';
import { authApi } from '../../services/api.ts';
import { compressImage } from '../../utils/image.ts';

export function AdminProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateUserAvatar = useAuthStore((s) => s.updateUserAvatar);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
                Admin
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
      </div>
    </AppShell>
  );
}
