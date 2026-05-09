import { useNavigate } from 'react-router-dom';
import { User, LogOut, Clock, Package, ChevronRight, Calendar, Camera, Upload } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { useAuthStore } from '../../stores/authStore.ts';
import { useHistoryStore } from '../../stores/historyStore.ts';
import { authApi, userApi } from '../../services/api.ts';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useEffect, useState, useRef } from 'react';
import type { User as UserType } from '../../types/index.ts';
import { Link } from 'react-router-dom';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateUser = useAuthStore((s) => s.updateUser);
  const history = useHistoryStore((s) => s.history);
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Avatar Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const data = await authApi.getMe();
        setProfileData(data);
        setEditName(data.name || '');
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await userApi.updateMe({ 
        name: editName
      });
      setProfileData(updatedUser);
      updateUser({ name: editName });
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading('Uploading avatar...');
    try {
      const { url } = await userApi.uploadAvatar(file);
      
      // Update profile with new avatar URL (photoURL)
      const updatedUser = await userApi.updateMe({ photoURL: url });
      setProfileData(updatedUser);
      updateUser({ photoURL: url });
      
      toast.success('Avatar updated successfully!', { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload avatar', { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  const displayUser = profileData || user;
  const role = displayUser?.role || 'student';

  if (!displayUser) return null;

  if (isLoading) {
    return (
      <AppShell title="Profile">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading profile...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const boughtBooks = history.filter(item => item.action === 'buy');
  const borrowedBooks = history.filter(item => item.action === 'borrow');

  return (
    <AppShell title="Profile">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        {/* Left Column: User Info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col items-center text-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 overflow-hidden border-2 border-white shadow-md relative">
                {displayUser.photoURL ? (
                  <img src={displayUser.photoURL} alt={displayUser.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-primary" />
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="absolute bottom-4 right-0 p-1.5 rounded-full bg-white shadow-lg border border-gray-100 text-gray-500 hover:text-primary transition-all opacity-0 group-hover:opacity-100">
                <Camera className="h-4 w-4" />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900">{displayUser.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{displayUser.email}</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider">
                {role}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 uppercase tracking-wider">
                Active
              </span>
            </div>

            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 rounded-xl border border-gray-100 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Edit Name
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut className="h-4 w-4" />
              Logout from account
            </button>
          </div>
        </div>

        {/* Right Column: Dynamic Content based on role / mode */}
        <div className="space-y-8">
          {isEditing ? (
            <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Edit Profile Details</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-blue-100 mt-0.5">
                      <Upload className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-900 mb-0.5">Avatar Management</p>
                      <p className="text-[10px] text-blue-700 leading-relaxed">
                        To change your profile picture, click on the camera icon over your current avatar on the left.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3.5 rounded-2xl bg-gray-50 text-gray-600 font-bold hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          ) : role === 'student' ? (
            <>
              {/* Borrowed Books Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <Clock className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Current Borrowings</h3>
                </div>
                
                {borrowedBooks.length > 0 ? (
                  <div className="grid gap-4">
                    {borrowedBooks.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 shadow-sm hover:shadow-md transition-all">
                        <div className="h-20 w-16 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-gray-900 truncate">{item.title}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 uppercase">
                              Borrowed
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">{item.author}</p>
                          <div className="flex items-center gap-4 text-xs font-medium">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Calendar className="h-3.5 w-3.5" />
                              Borrowed: {format(new Date(item.purchaseDate), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1.5 text-red-500">
                              <Clock className="h-3.5 w-3.5" />
                              Return by: {item.returnDate ? format(new Date(item.returnDate), 'MMM d, yyyy') : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-sm text-gray-400">No active borrowings.</p>
                    <Link to="/student/bookstore" className="text-xs font-bold text-primary hover:underline mt-2 inline-block">
                      Visit Bookstore
                    </Link>
                  </div>
                )}
              </section>

              {/* Purchased Books Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Purchased Books</h3>
                </div>
                
                {boughtBooks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {boughtBooks.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 shadow-sm hover:shadow-md transition-all">
                        <div className="h-16 w-12 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 truncate mb-1">{item.title}</h4>
                          <p className="text-[10px] text-gray-500 mb-2">Purchased on {format(new Date(item.purchaseDate), 'MMM d, yyyy')}</p>
                          <button className="flex items-center gap-1 text-[10px] font-bold text-primary hover:gap-2 transition-all">
                            View Details <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                    <p className="text-sm text-gray-400">No purchase history.</p>
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="space-y-6">
              <section className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Account Overview</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Welcome to your secure management portal. As an <span className="text-primary font-bold uppercase">{role}</span>, you have elevated permissions to manage sessions, users, and university resources.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Role Permission</p>
                    <p className="text-sm font-bold text-gray-900 capitalize">{role} Level</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Member Since</p>
                    <p className="text-sm font-bold text-gray-900">Fall 2025</p>
                  </div>
                </div>
              </section>

              <section className="bg-primary/5 rounded-3xl border border-primary/10 p-8">
                <h3 className="text-lg font-bold text-primary mb-2">Security Notice</h3>
                <p className="text-xs text-primary/70 font-medium">
                  Ensure your account credentials remain confidential. Always sign out from shared devices after completing your administrative tasks.
                </p>
              </section>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
