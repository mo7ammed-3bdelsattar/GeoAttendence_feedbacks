import { useState, useEffect, useMemo } from 'react';
import { Loader2, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { Modal } from '../../components/Modal/index.ts';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { DataTable, type Column } from '../../components/ui/DataTable.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { QuickCreateButton } from '../../components/ui/QuickCreateButton.tsx';
import { adminApi } from '../../services/api.ts';
import type { Department } from '../../types/index.ts';

export function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getDepartments();
      setDepartments(data ?? []);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return departments.filter(
      (d) =>
        (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.code || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [departments, search]);

  const handleCreate = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error('Name and code are required.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await adminApi.createDepartment({
        name: name.trim(),
        code: code.trim().toUpperCase(),
      });
      setDepartments((prev) => [...prev, created]);
      toast.success('Department created.');
      setAddOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error('Creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing || !name.trim() || !code.trim()) return;
    setSubmitting(true);
    try {
      const updated = await adminApi.updateDepartment(editing.id, {
        name: name.trim(),
        code: code.trim().toUpperCase()
      });
      setDepartments((prev) => prev.map((d) => (d.id === editing.id ? updated : d)));
      toast.success('Department updated.');
      setEditOpen(false);
      resetForm();
    } catch {
      toast.error('Update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (department: Department) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    setDeletingId(department.id);
    try {
      await adminApi.deleteDepartment(department.id);
      setDepartments((prev) => prev.filter((item) => item.id !== department.id));
      toast.success('Department deleted.');
    } catch {
      toast.error('Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setName('');
    setCode('');
    setEditing(null);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setName(d.name);
    setCode(d.code);
    setEditOpen(true);
  };

  const columns: Column<Department>[] = [
    { id: 'code', header: 'Code', accessor: (r) => r.code, sortable: true },
    { id: 'name', header: 'Name', accessor: (r) => r.name, sortable: true },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => openEdit(r)} className="p-1 text-gray-500 hover:text-primary">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(r)}
            disabled={deletingId === r.id}
            className="p-1 text-gray-500 hover:text-red-600 disabled:opacity-50"
          >
            {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Departments">
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search departments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary/10"
        />
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <DataTable columns={columns} data={filtered} keyExtractor={(r) => r.id} />
      )}

      <QuickCreateButton label="Quick Create Department" onClick={() => { resetForm(); setAddOpen(true); }} />

      {/* Add Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Create Department"
        footer={
          <>
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium">
              Cancel
            </button>
            <button type="button" onClick={handleCreate} disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">
              Create
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormInput label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <FormInput label="Code" value={code} onChange={(e) => setCode(e.target.value)} fullWidth />
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Department"
        footer={
          <>
            <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium">
              Cancel
            </button>
            <button type="button" onClick={handleUpdate} disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">
              Save
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormInput label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <FormInput label="Code" value={code} onChange={(e) => setCode(e.target.value)} fullWidth />
        </div>
      </Modal>
    </AppShell>
  );
}
