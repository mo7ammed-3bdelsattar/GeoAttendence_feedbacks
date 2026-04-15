import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  BookOpen,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  LockOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { Modal } from '../../components/Modal/index.ts';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { FormSelect } from '../../components/forms/FormSelect.tsx';
import { DataTable, type Column } from '../../components/ui/DataTable.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { QuickCreateButton } from '../../components/ui/QuickCreateButton.tsx';
import { adminApi } from '../../services/api.ts';
import type { Course, Department, User } from '../../types/index.ts';

export function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculty, setFaculty] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCode, setAddCode] = useState('');
  const [addDepartmentId, setAddDepartmentId] = useState('');
  const [addFacultyId, setAddFacultyId] = useState('');
  const [addIsOpen, setAddIsOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getCourses()
      .then((rows) => setCourses(rows ?? []))
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load courses');
      })
      .finally(() => setLoading(false));
    adminApi
      .getDepartments()
      .then((rows) => setDepartments(rows ?? []))
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load departments');
      });
    adminApi
      .getUsers('faculty')
      .then((rows) => setFaculty(rows ?? []))
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load faculty list');
      });
  }, []);

  const handleAdd = async () => {
    if (!addName.trim() || !addCode.trim() || !addDepartmentId || !addFacultyId) {
      toast.error('Course name, code, department, and faculty are required.');
      return;
    }
    setSubmitting(true);
    try {
      const selectedDepartment = departments.find((d) => d.id === addDepartmentId);
      const selectedFaculty = faculty.find((f) => f.id === addFacultyId);
      const created = await adminApi.createCourse({
        name: addName.trim(),
        code: addCode.trim().toUpperCase(),
        departmentId: addDepartmentId,
        departmentName: selectedDepartment?.name ?? '',
        facultyId: addFacultyId,
        facultyName: selectedFaculty?.name ?? '',
        isOpen: addIsOpen,
        enrolledCount: 0,
      });
      setCourses((prev) => [...prev, created]);
      toast.success('Course created.');
      setAddOpen(false);
      setAddName('');
      setAddCode('');
      setAddDepartmentId('');
      setAddFacultyId('');
      setAddIsOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (course: Course) => {
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (!confirmed) return;

    setDeletingId(course.id);
    try {
      await adminApi.deleteCourse(course.id);
      setEnrollments((prev) => prev.filter((item) => item.id !== course.id));
      toast.success('Course deleted successfully.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete course.');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleEnrollment = async (course: Course) => {
    setTogglingId(course.id);
    try {
      const nextOpen = !course.isOpen;
      const updated = await adminApi.updateCourse(course.id, { isOpen: nextOpen });
      setCourses((prev) =>
        prev.map((item) => (item.id === course.id ? { ...item, ...updated, isOpen: nextOpen } : item))
      );
      toast.success(nextOpen ? 'Enrollment opened for this course.' : 'Enrollment closed for this course.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update course enrollment status.');
    } finally {
      setTogglingId(null);
    }
  };

  const columns: Column<Course>[] = [
    { id: 'code', header: 'Code', accessor: (r) => r.code, sortable: true },
    { id: 'name', header: 'Course', accessor: (r) => r.name, sortable: true },
    { id: 'department', header: 'Department', accessor: (r) => r.departmentName },
    { id: 'faculty', header: 'Faculty', accessor: (r) => r.facultyName ?? '–' },
    {
      id: 'isOpen',
      header: 'Enrollment',
      accessor: (r) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            r.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {r.isOpen ? 'Open' : 'Closed'}
        </span>
      ),
    },
    { id: 'enrolled', header: 'Enrolled', accessor: (r) => r.enrolledCount },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleEnrollment(r)}
            disabled={togglingId === r.id}
            className="p-1 text-gray-500 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Toggle enrollment"
            title={r.isOpen ? 'Close enrollment' : 'Open enrollment'}
          >
            {togglingId === r.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : r.isOpen ? (
              <LockOpen className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleDelete(r)}
            disabled={deletingId === r.id}
            className="p-1 text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Delete course"
          >
            {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <AppShell title="Courses">
        <TableSkeleton rows={5} />
      </AppShell>
    );
  };

  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: `${d.code} — ${d.name}`,
  }));

  return (
    <AppShell title="Courses">
      <DataTable columns={columns} data={courses} keyExtractor={(r) => r.id} />
      <QuickCreateButton label="Quick Create Course" onClick={() => setAddOpen(true)} />
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Create course"
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
          <FormInput label="Course name" value={addName} onChange={(e) => setAddName(e.target.value)} fullWidth />
          <FormInput label="Course code" value={addCode} onChange={(e) => setAddCode(e.target.value)} fullWidth />
          <FormSelect
            label="Department"
            value={addDepartmentId}
            onChange={(e) => setAddDepartmentId(e.target.value)}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="Select department"
            fullWidth
          />
          <FormSelect
            label="Faculty"
            value={addFacultyId}
            onChange={(e) => setAddFacultyId(e.target.value)}
            options={faculty.map((f) => ({ value: f.id, label: f.name }))}
            placeholder="Select faculty"
            fullWidth
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={addIsOpen}
              onChange={(e) => setAddIsOpen(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Enrollment open for students
          </label>
        </div>
      </Modal>
    </AppShell>
  );
}
