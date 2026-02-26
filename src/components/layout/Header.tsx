import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore.ts';
import { cn } from '../../utils/cn.ts';

export function Header() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-primary text-lg">Geo-Attendance</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-gray-600" />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="hidden sm:inline text-sm font-medium text-gray-700">{user?.name}</span>
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpen(false)} />
              <div
                className={cn(
                  'absolute right-0 mt-1 w-48 py-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20'
                )}
              >
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
