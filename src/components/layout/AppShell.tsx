import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Home,
  User,
  LogOut,
  BookOpen,
  MapPin,
  CalendarDays,
  MessageSquare,
  Star,
  Building2,
  Tag,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore.ts';
import type { UserRole } from '../../types/index.ts';
import { cn } from '../../utils/cn.ts';
import { AiChatWidget } from '../ai/AiChatWidget.tsx';

const studentNav = [
  { to: '/student', label: 'Home', icon: Home },
  { to: '/student/schedule', label: 'My Schedule', icon: CalendarDays },
  { to: '/student/profile', label: 'Profile', icon: User },
  { to: '/student/feedback', label: 'Feedback', icon: Star },
  { to: '/chatbot', label: 'Bot Assistant', icon: MessageSquare },
  { to: '/student/bookstore', label: 'Book Store', icon: BookOpen },
  { to: '/student/chat', label: 'Support', icon: MessageSquare },
];

const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/enrollments', label: 'Enrollments', icon: BookOpen },
  { to: '/admin/sessions', label: 'Sessions', icon: CalendarDays },
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/groups', label: 'Groups', icon: Users },
  { to: '/admin/classrooms', label: 'Classrooms', icon: MapPin },
  { to: '/admin/feedback', label: 'Course Feedback', icon: Star },
  { to: '/admin/policies', label: 'Bot Policies', icon: BookOpen },
  { to: '/admin/books', label: 'Book Library', icon: BookOpen },
  { to: '/admin/book-transactions', label: 'Book Transactions', icon: Tag },
  { to: '/admin/chats', label: 'Student Support', icon: MessageSquare },
];

const facultyNav = [
  { to: '/faculty/sessions', label: 'My Sessions', icon: CalendarDays },
  { to: '/faculty/ratings', label: 'My Ratings', icon: Star },
  { to: '/faculty/reports', label: 'Analytics', icon: LayoutDashboard },
];

function getNav(role: UserRole) {
  if (role === 'student') return studentNav;
  if (role === 'faculty') return facultyNav;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-gray-100 bg-white shadow-sm">
        <div className="flex h-16 items-center px-6 border-b border-gray-50">
          <span className="font-bold text-primary text-xl tracking-tight">GeoAttendance</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                  active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-white' : 'text-gray-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-4/5 max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
              <span className="font-bold text-primary text-xl">GeoAttendance</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold transition-all',
                      active ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-gray-400')} />
                      {item.label}
                    </div>
                    <ChevronRight className={cn('h-4 w-4 opacity-30', active && 'opacity-100')} />
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 font-bold hover:bg-red-50 transition-all"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-md px-4 h-16 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">{title ?? 'Dashboard'}</h1>
          </div>
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-gray-900 leading-none mb-1 truncate max-w-[100px]">
                  {user?.name?.split(' ')[0] ?? 'User'}
                </p>
                <p className="text-[10px] text-gray-400 font-medium leading-none capitalize">{role}</p>
              </div>
            </button>
            
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 p-2 rounded-2xl border border-gray-100 bg-white shadow-2xl z-20 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 py-3 border-b border-gray-50">
                    <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <div className="p-1 mt-1">
                    <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
                      <User className="h-4 w-4" /> Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
          {children}
        </main>
        
        <AiChatWidget />
      </div>
    </div>
  );
}
