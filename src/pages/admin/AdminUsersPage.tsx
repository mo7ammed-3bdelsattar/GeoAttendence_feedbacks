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

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
  student: {
    label: 'Student',
    color: 'text-white',
    bg: 'bg-blue-500',
    border: 'border-blue-200',
  },
  faculty: {
    label: 'Faculty',
    color: 'text-white',
    bg: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  admin: {
    label: 'Admin',
    color: 'text-white',
    bg: 'bg-violet-500',
    border: 'border-violet-200',
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

  // Add user modal
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('student');
  const [addPassword, setAddPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit user modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete confirm
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    adminApi.getUsers()
      .then((users) => {
        setAllUsers(users || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch users:', err);
        toast.error('Failed to load users from database');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Counts per role for stats bar
  const counts = useMemo(
    () => ({
      all: allUsers.length,
      student: allUsers.filter((u) => u?.role === 'student').length,
      faculty: allUsers.filter((u) => u?.role === 'faculty').length,
      admin: allUsers.filter((u) => u?.role === 'admin').length,
    }),
    [allUsers]
  );

  const filtered = useMemo(() => {
    let list = tab === 'all' ? allUsers : allUsers.filter((u) => u?.role === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) => (u?.name?.toLowerCase() || '').includes(q) || (u?.email?.toLowerCase() || '').includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const aVal = a?.[sortKey] ?? '';
      const bVal = b?.[sortKey] ?? '';
      try {
        return String(aVal).localeCompare(String(bVal)) * (sortDir === 'asc' ? 1 : -1);
      } catch {
        return 0;
      }
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

  const handleTabChange = (t: typeof tab) => { setTab(t); setPage(0); };
  const handleSearch = (q: string) => { setSearch(q); setPage(0); };

  // Add
  const handleAdd = async () => {
    if (!addName.trim() || !addEmail.trim()) { toast.error('Name and email are required.'); return; }
    setSubmitting(true);
    try {
      const newUser = await adminApi.createUser({ name: addName, email: addEmail, role: addRole, password: addPassword });
      setAllUsers((prev) => [...prev, newUser]);
      toast.success('User added successfully.');
      setAddOpen(false);
      setAddName(''); setAddEmail(''); setAddPassword(''); setAddRole('student');
    } catch {
      toast.error('Failed to add user.');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit
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
      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id
            ? { ...u, name: updated.name ?? editName, email: updated.email ?? editEmail, role: updated.role ?? editRole }
            : u
        )
      );
      toast.success('User updated.');
      setEditUser(null);
    } catch {
      toast.error('Failed to update user.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Delete — calls real API then removes from local state
  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await adminApi.deleteUser(deleteUser.id);
      setAllUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      toast.success(`${deleteUser.name} deleted.`);
    } catch {
      toast.error('Failed to delete user.');
    } finally {
      setDeleteUser(null);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="h-3.5 w-3.5 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
      : <ChevronDown className="h-3.5 w-3.5 text-primary" />;
  };

  const tabItems: { key: UserRole | 'all'; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all',     label: 'All Users', icon: <Users className="h-4 w-4" />,        count: counts.all },
    { key: 'student', label: 'Students',  icon: <GraduationCap className="h-4 w-4" />, count: counts.student },
    { key: 'faculty', label: 'Faculty',   icon: <BookOpen className="h-4 w-4" />,     count: counts.faculty },
    { key: 'admin',   label: 'Admins',    icon: <ShieldCheck className="h-4 w-4" />,  count: counts.admin },
  ];

  return (
    <AppShell title="User Management">
      {/* ── Stats chips ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-5">
        {tabItems.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150 shadow-sm
              ${tab === t.key
                ? 'bg-primary text-white border-primary shadow-primary/20 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
          >
            {t.icon}
            {t.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold
              ${tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table card ──────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm
                         focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100"
              >
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
          </div>

          <div className="flex gap-2 ml-auto">
            <Link
              to="/admin/users/signup"
              className="flex items-center gap-1.5 rounded-lg bg-primary text-white px-3 py-2 text-sm font-medium
                         hover:bg-primary/90 transition-colors shadow-sm"
            >
              <UserPlus className="h-4 w-4" /> Sign up
            </Link>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
                         font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Quick add
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-4"><TableSkeleton rows={8} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide text-xs w-10">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide text-xs">User</th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide text-xs cursor-pointer select-none hover:text-gray-700 group"
                    onClick={() => handleSort('email')}
                  >
                    <span className="flex items-center gap-1">Email <SortIcon col="email" /></span>
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide text-xs cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('role')}
                  >
                    <span className="flex items-center gap-1">Role <SortIcon col="role" /></span>
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase tracking-wide text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-14 text-center text-gray-400">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No users found.
                    </td>
                  </tr>
                ) : (
                  pageData.map((user, idx) => {
                    const rc = ROLE_CONFIG[user.role as UserRole] || ROLE_CONFIG.student;
                    const initials = getInitials(user.name);
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors duration-100"
                      >
                        {/* Row number */}
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                          {page * PAGE_SIZE + idx + 1}
                        </td>

                        {/* User (avatar + name sorted) */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full inline-flex items-center text-xs font-semibold  ${rc.color} ${rc.bg} ${rc.border} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white text-xs font-bold">{initials}</span>
                            </div>
                            <button
                              type="button"
                              className="text-gray-900 font-medium hover:text-primary text-left transition-colors"
                              onClick={() => openEdit(user)}
                            >
                              {user.name}
                            </button>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 text-gray-500">{user.email}</td>

                        {/* Role badge */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border
                            ${rc.color} ${rc.bg} ${rc.border}`}>
                            {rc.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Edit user"
                              onClick={() => openEdit(user)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Delete user"
                              onClick={() => setDeleteUser(user)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
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
        )}

        {/* Pagination footer */}
        {!loading && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
            <p className="text-xs text-gray-500">
              Showing{' '}
              <span className="font-semibold text-gray-700">
                {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)}
              </span>{' '}
              of <span className="font-semibold text-gray-700">{filtered.length}</span> users
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = totalPages <= 7 ? i : i; // simplified: show up to 7 pages
                return (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setPage(pg)}
                    className={`h-7 w-7 rounded-lg text-xs font-medium transition-colors
                      ${page === pg ? 'bg-primary text-white' : 'hover:bg-gray-200 text-gray-600'}`}
                  >
                    {pg + 1}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add User Modal ───────────────────────────────── */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Quick Add User"
        footer={
          <>
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={handleAdd} disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-60">
              {submitting ? 'Adding…' : 'Add User'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormInput label="Full Name" value={addName} onChange={(e) => setAddName(e.target.value)} fullWidth placeholder="e.g. John Doe" />
          <FormInput label="Email" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} fullWidth placeholder="john@uni.edu" />
          <FormSelect label="Role" options={roleOptions} value={addRole} onChange={(e) => setAddRole(e.target.value as UserRole)} fullWidth />
          <FormInput label="Password" type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} fullWidth placeholder="Temporary password" />
        </div>
      </Modal>

      {/* ── Edit User Modal ──────────────────────────────── */}
      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit User"
        footer={
          <>
            <button type="button" onClick={() => setEditUser(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={handleEdit} disabled={editSubmitting} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-60">
              {editSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className="space-y-4 card py-4">
          {editUser && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 mb-2">
              <div className={`h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center`}>
                <span className="text-white text-sm font-bold">{getInitials(editUser.name)}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{editUser.name}</p>
                <p className="text-xs text-gray-500">{editUser.id}</p>
              </div>
            </div>
          )}
          <FormInput label="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth />
          <FormInput label="Email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} fullWidth />
          <FormSelect label="Role" options={roleOptions} value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} fullWidth />
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ─────────────────────────── */}
      <Modal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        title="Delete User"
        footer={
          <>
            <button type="button" onClick={() => setDeleteUser(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">
              Delete
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-gray-700 text-sm">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">{deleteUser?.name}</span>?<br />
            This action cannot be undone.
          </p>
        </div>
      </Modal>
    </AppShell>
  );
}
