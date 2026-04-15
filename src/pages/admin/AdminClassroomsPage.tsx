import { useState, useEffect } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { DataTable, type Column } from '../../components/ui/DataTable.tsx';
import { Modal } from '../../components/Modal/index.ts';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { FormMapPicker } from '../../components/forms/FormMapPicker.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { QuickCreateButton } from '../../components/ui/QuickCreateButton.tsx';
import { adminApi } from '../../services/api.ts';
import type { Classroom } from '../../types/index.ts';
import toast from 'react-hot-toast';

export function AdminClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [radius, setRadius] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addBuilding, setAddBuilding] = useState('');
  const [addLat, setAddLat] = useState(0);
  const [addLng, setAddLng] = useState(0);
  const [addRadius, setAddRadius] = useState(50);

  useEffect(() => {
    adminApi
      .getClassrooms()
      .then(setClassrooms)
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load classrooms');
      })
      .finally(() => setLoading(false));
  }, []);

  const openEdit = (c: Classroom) => {
    setEditing(c);
    setName(c.name);
    setBuilding(c.building);
    setLat(c.lat);
    setLng(c.lng);
    setRadius(c.geofenceRadiusMeters);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSubmitting(true);
    try {
      await adminApi.updateClassroom(editing.id, {
        name,
        building,
        lat,
        lng,
        geofenceRadiusMeters: radius,
      });
      setClassrooms((prev) =>
        prev.map((c) =>
          c.id === editing.id
            ? { ...c, name, building, lat, lng, geofenceRadiusMeters: radius }
            : c,
        ),
      );
      toast.success('Classroom updated.');
      setEditOpen(false);
      setEditing(null);
    } catch (err) {
      console.error(err);
      toast.error('Update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdd = async () => {
    if (!addName.trim() || !addBuilding.trim()) {
      toast.error('Classroom name and building are required.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await adminApi.createClassroom({
        name: addName.trim(),
        building: addBuilding.trim(),
        lat: addLat,
        lng: addLng,
        geofenceRadiusMeters: addRadius,
      });
      setClassrooms((prev) => [...prev, created]);
      toast.success('Classroom created.');
      setAddOpen(false);
      setAddName('');
      setAddBuilding('');
      setAddLat(0);
      setAddLng(0);
      setAddRadius(50);
    } catch (err) {
      console.error(err);
      toast.error('Creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (classroom: Classroom) => {
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (!confirmed) return;

    setDeletingId(classroom.id);
    try {
      await adminApi.deleteClassroom(classroom.id);
      setClassrooms((prev) => prev.filter((item) => item.id !== classroom.id));
      toast.success('Classroom deleted successfully.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete classroom.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: Column<Classroom>[] = [
    { id: 'name', header: 'Name', accessor: (r) => r.name, sortable: true },
    { id: 'building', header: 'Building', accessor: (r) => r.building },
    {
      id: 'coords',
      header: 'GPS',
      accessor: (r) => `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`,
    },
    {
      id: 'radius',
      header: 'Geofence (m)',
      accessor: (r) => r.geofenceRadiusMeters,
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEdit(r)}
            className="p-1 text-gray-500 hover:text-primary"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(r)}
            disabled={deletingId === r.id}
            className="p-1 text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Delete classroom"
          >
            {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <AppShell title="Classrooms">
        <TableSkeleton rows={5} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Classrooms">
      <DataTable
        columns={columns}
        data={classrooms}
        keyExtractor={(r) => r.id}
      />
      <QuickCreateButton label="Quick Create Classroom" onClick={() => setAddOpen(true)} />
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit classroom"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-60"
            >
              Save
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <FormInput
            label="Building"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            fullWidth
          />
          <FormMapPicker
            label="Location & geofence"
            center={{ lat, lng }}
            radiusMeters={radius}
            onCenterChange={(la, ln) => {
              setLat(la);
              setLng(ln);
            }}
            onRadiusChange={setRadius}
            height="200px"
          />
        </div>
      </Modal>
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Create classroom"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-60"
            >
              Create
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormInput
            label="Name"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            fullWidth
          />
          <FormInput
            label="Building"
            value={addBuilding}
            onChange={(e) => setAddBuilding(e.target.value)}
            fullWidth
          />
          <FormMapPicker
            label="Location & geofence"
            center={{ lat: addLat, lng: addLng }}
            radiusMeters={addRadius}
            onCenterChange={(la, ln) => {
              setAddLat(la);
              setAddLng(ln);
            }}
            onRadiusChange={setAddRadius}
            height="200px"
          />
        </div>
      </Modal>
    </AppShell>
  );
}