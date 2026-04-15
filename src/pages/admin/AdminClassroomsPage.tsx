import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { DataTable, type Column } from '../../components/ui/DataTable.tsx';
import { Modal } from '../../components/Modal/index.ts';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { FormMapPicker } from '../../components/forms/FormMapPicker.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
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
        <button
          type="button"
          onClick={() => openEdit(r)}
          className="p-1 text-gray-500 hover:text-primary"
        >
          <Pencil className="h-4 w-4" />
        </button>
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
    </AppShell>
  );
}