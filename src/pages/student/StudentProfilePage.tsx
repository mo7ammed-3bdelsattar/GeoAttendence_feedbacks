import { useNavigate } from 'react-router-dom';
import { User, LogOut, BookOpen, Clock, Package, ChevronRight, Calendar } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { useAuthStore } from '../../stores/authStore.ts';
import { useHistoryStore } from '../../stores/historyStore.ts';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function StudentProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const history = useHistoryStore((s) => s.history);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const boughtBooks = history.filter(item => item.action === 'buy');
  const borrowedBooks = history.filter(item => item.action === 'borrow');

  if (!user) return null;

  return (
    <AppShell title="Profile">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
        {/* Left Column: User Info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{user.email}</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider">
                Student
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 uppercase tracking-wider">
                Active
              </span>
            </div>
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

        {/* Right Column: Transactions */}
        <div className="space-y-8">
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
        </div>
      </div>
    </AppShell>
  );
}

// Need to import Link
import { Link } from 'react-router-dom';
