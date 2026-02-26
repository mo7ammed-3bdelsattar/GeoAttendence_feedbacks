import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Home,
  User,
  LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore.ts';
import type { UserRole } from '../../types/index.ts';
import { cn } from '../../utils/cn.ts';

const studentNav = [
  { to: '/student', label: 'Home', icon: Home },
];


const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
];

function getNav(role: UserRole) {
  if (role === 'student') return studentNav;
  return adminNav;
}

interface AppShellProps {
  children: ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const role = user?.role ?? 'student';
  const nav = getNav(role);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center px-4 border-b border-gray-200">
          <span className="font-semibold text-primary text-lg">Geo-Attendance</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
                  active ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:pl-56 flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">{title ?? 'Geo-Attendance'}</h1>
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {user?.name ?? user?.email}
              </span>
            </button>
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setUserMenuOpen(false)}
                />
                <div
                  className={cn(
                    'absolute right-0 mt-1 w-52 py-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20'
                  )}
                >
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 pb-24 md:pb-4">{children}</main>

        {/* Bottom nav mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white flex justify-around py-2 safe-area-pb">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-1 rounded-lg text-xs font-medium transition-colors duration-200',
                  active ? 'text-primary' : 'text-gray-500'
                )}
              >
                <Icon className="h-6 w-6" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
