import { useState } from 'react';
import { Search, ShoppingBag, RotateCcw, User, Calendar, Tag, Database, ShieldCheck } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { useTransactionStore } from '../../stores/transactionStore.ts';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export function AdminTransactionsPage() {
  const transactions = useTransactionStore((s) => s.transactions);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = transactions.filter(t => {
    const search = searchQuery.toLowerCase();
    return (
      (t.studentName?.toLowerCase() || '').includes(search) ||
      (t.studentId?.toLowerCase() || '').includes(search) ||
      (t.title?.toLowerCase() || '').includes(search) ||
      (t.collegeCode?.toLowerCase() || '').includes(search)
    );
  });

  const handleSeed = () => {
    const mock = [{
      id: 'debug-1', title: 'System Debug Book', author: 'Library Manager', 
      price: 0, coverImage: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=100',
      quantity: 1, action: 'buy' as const, collegeCode: 'DEBUG'
    }];
    useTransactionStore.getState().addTransaction(mock as any, { id: 'admin', name: 'Admin System' }, 'DEBUG');
    toast.success('Mock transaction seeded for UI check');
  };

  return (
    <AppShell title="Book Transactions">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">History</h2>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {transactions.length} Records
              </span>
              <button
                onClick={handleSeed}
                className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20 transition-all shadow-sm"
                title="Seed Debug Data"
              >
                <Database className="h-4 w-4" />
              </button>
            </div>
            
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students, IDs, or books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm bg-white"
              />
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Purchases</p>
              <p className="text-2xl font-bold text-primary">{transactions.filter(t => t.action === 'buy').length}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Borrowings</p>
              <p className="text-2xl font-bold text-emerald-600">{transactions.filter(t => t.action === 'borrow').length}</p>
            </div>
          </div>
        </div>

        {/* Desktop Table (Hidden on Mobile) */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Student Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Book Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Action & Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status/Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTransactions.map((t, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{t.studentName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">ID: {t.studentId}</p>
                          <p className="text-[10px] font-bold text-primary mt-0.5">Code: {t.collegeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={t.coverImage} className="h-10 w-8 object-cover rounded shadow-sm" alt="" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{t.title}</p>
                          <p className="text-[10px] text-gray-500">{t.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
                          t.action === 'borrow' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary'
                        }`}>
                          {t.action === 'borrow' ? <RotateCcw className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                          {t.action.toUpperCase()}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Calendar className="h-3 w-3" />
                          {t.date ? format(new Date(t.date), 'MMM d, HH:mm') : 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {t.action === 'borrow' ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                            Return: {t.returnDate ? format(new Date(t.returnDate), 'MMM d') : 'Expired'}
                          </span>
                          <span className="text-[9px] text-gray-400">{t.duration} Days total</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400 italic">Owned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile List View (Hidden on Desktop) */}
        <div className="md:hidden space-y-4">
          {filteredTransactions.map((t, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{t.studentName}</h4>
                    <p className="text-[10px] text-gray-400">ID: {t.studentId}</p>
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  t.action === 'borrow' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary'
                }`}>
                  {t.action.toUpperCase()}
                </div>
              </div>

              <div className="flex gap-3">
                <img src={t.coverImage} className="h-14 w-10 object-cover rounded shadow-sm" alt="" />
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-gray-900 truncate">{t.title}</h5>
                  <p className="text-[10px] text-gray-500 mb-2">{t.author}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {t.date ? format(new Date(t.date), 'MMM d') : 'N/A'}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-primary">
                      <ShieldCheck className="h-3 w-3" />
                      Code: {t.collegeCode}
                    </div>
                  </div>
                </div>
              </div>

              {t.action === 'borrow' && (
                <div className="bg-red-50 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Return Deadline
                  </span>
                  <span className="text-xs font-extrabold text-red-700">
                    {t.returnDate ? format(new Date(t.returnDate), 'MMM d, yyyy') : 'Expired'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <Tag className="h-12 w-12 text-gray-100 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">No transactions yet</h3>
            <p className="text-sm text-gray-500">Wait for students to make a purchase or borrowing.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
