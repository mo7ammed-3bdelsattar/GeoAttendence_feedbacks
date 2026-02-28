import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Users,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { Modal } from '../../components/Modal/index.ts';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { FormSelect } from '../../components/forms/FormSelect.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { adminApi } from '../../services/api.ts';
import type { User, UserRole } from '../../types/index.ts';
import toast from 'react-hot-toast';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'admin', label: 'Admin' },
];

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; border: string; icon: any }> = {
  student: {
    label: 'Student',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    icon: GraduationCap,
  },
  faculty: {
    label: 'Faculty',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    icon: BookOpen,
  },
  admin: {
    label: 'Admin',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    icon: ShieldCheck,
  },
};

function getInitials(name: string = '') {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

type SortKey = 'name' | 'email' | 'role';

const PAGE_SIZE = 10;

export function AdminUsersPage() {
  const [tab, setTab] = useState<UserRole | 'all'>('all');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('student');
  const [addPassword, setAddPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    adminApi.getUsers()
      .then((users) => {
        setAllUsers(users || []);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error('Failed to fetch users:', err);
        const msg = err.response?.data?.error || 'Connection failed: Ensure Node server is running on port 5000';
        toast.error(msg);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const counts = useMemo(() => ({
    all: allUsers.length,
    student: allUsers.filter((u) => u?.role === 'student').length,
    faculty: allUsers.filter((u) => u?.role === 'faculty').length,
    admin: allUsers.filter((u) => u?.role === 'admin').length,
  }), [allUsers]);

  const filtered = useMemo(() => {
    let list = tab === 'all' ? allUsers : allUsers.filter((u) => u?.role === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => 
        (u?.name?.toLowerCase() || '').includes(q) || 
        (u?.email?.toLowerCase() || '').includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const aVal = String(a?.[sortKey] ?? '').toLowerCase();
      const bVal = String(b?.[sortKey] ?? '').toLowerCase();
      return aVal.localeCompare(bVal) * (sortDir === 'asc' ? 1 : -1);
    });
    return list;
  }, [allUsers, tab, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(0);
  };

  const handleAdd = async () => {
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) { 
      toast.error('All fields are required.'); 
      return; 
    }
    setSubmitting(true);
    try {
      const newUser = await adminApi.createUser({ 
        name: addName, 
        email: addEmail, 
        role: addRole, 
        password: addPassword 
      });
      setAllUsers((prev) => [...prev, newUser]);
      toast.success('User created in Firestore & Auth');
      setAddOpen(false);
      setAddName(''); setAddEmail(''); setAddPassword(''); setAddRole('student');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setEditSubmitting(true);
    try {
      const updated = await adminApi.updateUser(editUser.id, {
        name: editName,
        email: editEmail,
        role: editRole,
      });
      setAllUsers((prev) => prev.map((u) => u.id === editUser.id ? { ...u, ...updated } : u));
      toast.success('User profile updated.');
      setEditUser(null);
    } catch {
      toast.error('Failed to update user.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await adminApi.deleteUser(deleteUser.id);
      setAllUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      toast.success(`User ${deleteUser.name} removed from system.`);
    } catch {
      toast.error('Deletion failed.');
    } finally {
      setDeleteUser(null);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="h-4 w-4 opacity-20" />;
    return sortDir === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-primary" /> 
      : <ChevronDown className="h-4 w-4 text-primary" />;
  };

  return (
    <AppShell title="Users & Permissions">
      <div className="space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage platform access, roles, and profiles.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   <List className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   <LayoutGrid className="h-4 w-4" />
                </button>
             </div>
             <Link
                to="/admin/users/signup"
                className="flex items-center gap-2 rounded-xl bg-gray-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
              >
                <UserPlus className="h-4 w-4" /> Sign up
              </Link>
          </div>
        </div>

        {/* Filters & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 p-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto no-scrollbar max-w-full">
            {[
              { key: 'all', label: 'All', icon: Users, count: counts.all },
              { key: 'student', label: 'Students', icon: GraduationCap, count: counts.student },
              { key: 'faculty', label: 'Faculty', icon: BookOpen, count: counts.faculty },
              { key: 'admin', label: 'Admins', icon: ShieldCheck, count: counts.admin },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key as any); setPage(0); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                  ${tab === t.key 
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search by name, email, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Data View */}
        {loading ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <TableSkeleton rows={8} />
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-16 text-center">#</th>
                    <th onClick={() => handleSort('name')} className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors">
                      <div className="flex items-center gap-2">Name Profile <SortIcon col="name" /></div>
                    </th>
                    <th onClick={() => handleSort('email')} className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors">
                      <div className="flex items-center gap-2">Email Identity <SortIcon col="email" /></div>
                    </th>
                    <th onClick={() => handleSort('role')} className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors">
                      <div className="flex items-center gap-2">Access Role <SortIcon col="role" /></div>
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pageData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-24 text-center">
                         <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                               <Users className="h-8 w-8 text-gray-200" />
                            </div>
                            <p className="text-gray-400 font-medium">No results found in database</p>
                         </div>
                      </td>
                    </tr>
                  ) : (
                    pageData.map((user, idx) => {
                      const cfg = ROLE_CONFIG[user.role as UserRole] || ROLE_CONFIG.student;
                      const RoleIcon = cfg.icon;
                      return (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4 text-xs font-mono text-gray-300 text-center">{(page * PAGE_SIZE) + idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-2xl ${cfg.bg} ${cfg.color} flex items-center justify-center font-bold text-sm shadow-sm`}>
                                {getInitials(user.name)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                                <p className="text-[10px] uppercase font-bold text-gray-300 tracking-tighter">ID: {user.id.substring(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-medium">{user.email}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                              <RoleIcon className="h-3 w-3" />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(user)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                                   <Pencil className="h-4 w-4" />
                                </button>
                                <button onClick={() => setDeleteUser(user)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                   <Trash2 className="h-4 w-4" />
                                </button>
                             </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-6 py-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-400">
                Displaying <span className="text-gray-900">{pageData.length}</span> of <span className="text-gray-900">{filtered.length}</span> results
              </p>
              <div className="flex items-center gap-1">
                 <button 
                   disabled={page === 0}
                   onClick={() => setPage(p => p - 1)}
                   className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-20 transition-all"
                 >
                    <ChevronLeft className="h-4 w-4" />
                 </button>
                 <div className="flex items-center gap-1 mx-2">
                    {[...Array(totalPages)].map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setPage(i)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${page === i ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                 </div>
                 <button 
                   disabled={page >= totalPages - 1}
                   onClick={() => setPage(p => p + 1)}
                   className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-20 transition-all"
                 >
                    <ChevronRight className="h-4 w-4" />
                 </button>
              </div>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {pageData.map((user) => {
                const cfg = ROLE_CONFIG[user.role as UserRole] || ROLE_CONFIG.student;
                return (
                  <div key={user.id} className="relative bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all group">
                     <div className="flex items-start justify-between mb-4">
                        <div className={`h-14 w-14 rounded-2xl ${cfg.bg} ${cfg.color} flex items-center justify-center text-xl font-bold`}>
                           {getInitials(user.name)}
                        </div>
                        <div className="flex gap-1">
                           <button onClick={() => openEdit(user)} className="p-2 text-gray-300 hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                           <button onClick={() => setDeleteUser(user)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                     </div>
                     <h4 className="text-lg font-bold text-gray-900 truncate">{user.name}</h4>
                     <p className="text-sm text-gray-500 truncate mb-4">{user.email}</p>
                     <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-widest ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        <cfg.icon className="h-3 w-3" />
                        {cfg.label}
                     </div>
                  </div>
                );
             })}
          </div>
        )}

        {/* Global Toolbar */}
        <div className="fixed bottom-8 right-8">
           <button 
             onClick={() => setAddOpen(true)}
             className="flex items-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-bold shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
           >
              <Plus className="h-5 w-5" />
              Quick Create
           </button>
        </div>

      </div>

      {/* ── Modals ─────────────────────────────────────── */}
      
      {/* Quick Add Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add System User"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={() => setAddOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all">Cancel</button>
            <button onClick={handleAdd} disabled={submitting} className="flex-2 px-8 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50">
              {submitting ? 'Authenticating...' : 'Confirm Registration'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <FormInput label="Display Name" value={addName} onChange={(e) => setAddName(e.target.value)} fullWidth placeholder="e.g. Dr. Sarah Jenkins" />
          <FormInput label="Official Email" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} fullWidth placeholder="sarah@uni.edu" />
          <div className="grid grid-cols-2 gap-4">
             <FormSelect label="Access Level" options={roleOptions} value={addRole} onChange={(e) => setAddRole(e.target.value as UserRole)} fullWidth />
             <FormInput label="Temporary Password" type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} fullWidth placeholder="••••••••" />
          </div>
          <p className="text-[10px] text-gray-400 italic mt-2">Note: User will be created in both Firebase Auth and Firestore Database.</p>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="Settings & Profile"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={() => setEditUser(null)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
            <button onClick={handleEdit} disabled={editSubmitting} className="flex-2 px-8 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg">
              {editSubmitting ? 'Syncing...' : 'Update Record'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {editUser && (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 mb-2">
              <div className="h-14 w-14 rounded-2xl bg-gray-900 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {getInitials(editUser.name)}
              </div>
              <div>
                <p className="font-bold text-gray-900">{editUser.name}</p>
                <p className="text-[10px] text-gray-400 font-mono">INTERNAL_UID: {editUser.id}</p>
              </div>
            </div>
          )}
          <FormInput label="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth />
          <FormInput label="Email Identity" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} fullWidth />
          <FormSelect label="System Role" options={roleOptions} value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} fullWidth />
        </div>
      </Modal>

      {/* Danger Zone: Delete Modal */}
      <Modal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        title="Danger Area"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={() => setDeleteUser(null)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
            <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-200">Permanently Remove</button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center animate-pulse">
            <Trash2 className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-900">Are you absolutely sure?</h4>
            <p className="text-sm text-gray-500 mt-2 px-4 leading-relaxed">
              You are about to delete <span className="font-bold text-gray-900">{deleteUser?.name}</span>. 
              This will revoke all access and erase their profile from both Firestore and Firebase Authentication.
            </p>
          </div>
        </div>
      </Modal>

    </AppShell>
  );
}
