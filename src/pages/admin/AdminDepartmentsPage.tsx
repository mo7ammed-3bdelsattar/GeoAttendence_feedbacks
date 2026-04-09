import { useState, useEffect } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { DataTable, type Column } from '../../components/ui/DataTable.tsx';
import { Modal } from '../../components/Modal/index.ts';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { QuickCreateButton } from '../../components/ui/QuickCreateButton.tsx';
import { adminApi } from '../../services/api.ts';
import type { Department } from '../../types/index.ts';
import toast from 'react-hot-toast';

export function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCode, setAddCode] = useState('');

  useEffect(() => {
    adminApi.getDepartments()
      .then(setDepartments)
      .catch(err => {
        console.error(err);
        toast.error('Failed to load departments');
      })
      .finally(() => setLoading(false));
  }, []);

  const openEdit = (d: Department) => {
    setEditing(d);
    setName(d.name);
    setCode(d.code);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSubmitting(true);
    try {
      await adminApi.updateDepartment(editing.id, { name, code });
      setDepartments((prev) => prev.map((d) => (d.id === editing.id ? { ...d, name, code } : d)));
      toast.success('Department updated.');
      setEditOpen(false);
      setEditing(null);
    } catch {
      toast.error('Update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdd = async () => {
    if (!addName.trim() || !addCode.trim()) {
      toast.error('Name and code are required.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await adminApi.createDepartment({
        name: addName.trim(),
        code: addCode.trim().toUpperCase(),
      });
      setDepartments((prev) => [...prev, created]);
      toast.success('Department created.');
      setAddOpen(false);
      setAddName('');
      setAddCode('');
    } catch (err) {
      console.error(err);
      toast.error('Creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (department: Department) => {
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (!confirmed) return;

    setDeletingId(department.id);
    try {
      await adminApi.deleteDepartment(department.id);
      setDepartments((prev) => prev.filter((item) => item.id !== department.id));
      toast.success('Department deleted successfully.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete department.');
    } finally {
      setDeletingId(null);
    }
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
            className="p-1 text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Delete department"
          >
            {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <AppShell title="Departments">
        <TableSkeleton rows={5} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Departments">
      <DataTable columns={columns} data={departments} keyExtractor={(r) => r.id} />
      <QuickCreateButton label="Quick Create Department" onClick={() => setAddOpen(true)} />
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit department"
        footer={
          <>
            <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-60">
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
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Create department"
        footer={
          <>
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium">
              Cancel
            </button>
            <button type="button" onClick={handleAdd} disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-60">
              Create
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormInput label="Name" value={addName} onChange={(e) => setAddName(e.target.value)} fullWidth />
          <FormInput label="Code" value={addCode} onChange={(e) => setAddCode(e.target.value)} fullWidth />
        </div>
      </Modal>
    </AppShell>
  );
}