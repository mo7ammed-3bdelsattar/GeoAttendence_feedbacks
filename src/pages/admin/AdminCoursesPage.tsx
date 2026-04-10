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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { Modal } from '../../components/Modal/index.ts';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { adminApi } from '../../services/api.ts';
import type { Course, Department } from '../../types/index.ts';

type SortKey = 'name' | 'departmentName' | 'enrolledCount';

const PAGE_SIZE = 10;

export function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cData, dData] = await Promise.all([
        adminApi.getCourses(),
        adminApi.getDepartments(),
      ]);
      setCourses(cData ?? []);
      setDepartments(dData ?? []);
    } catch (err: unknown) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let list = [...courses];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.code || '').toLowerCase().includes(q) ||
          (c.departmentName || '').toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      if (sortKey === 'enrolledCount') {
        const aVal = a.enrolledCount ?? 0;
        const bVal = b.enrolledCount ?? 0;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aVal = String(a[sortKey] ?? '').toLowerCase();
      const bVal = String(b[sortKey] ?? '').toLowerCase();
      return aVal.localeCompare(bVal) * (sortDir === 'asc' ? 1 : -1);
    });
    return list;
  }, [courses, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const openAdd = () => {
    setName('');
    setCode('');
    setDepartmentId('');
    setFacultyName('');
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!name.trim() || !code.trim() || !departmentId) {
      toast.error('Course Name, Code, and Department are required.');
      return;
    }
    const dept = departments.find((d) => d.id === departmentId);
    if (!dept) {
      toast.error('Please select a valid department.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim(),
        departmentId: dept.id,
        departmentName: dept.name,
        facultyName: facultyName.trim() || undefined,
      };
      const created = await adminApi.createCourse(payload);
      setCourses((prev) => [...prev, created]);
      toast.success('Course added successfully');
      setAddOpen(false);
      setName('');
      setCode('');
      setDepartmentId('');
      setFacultyName('');
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to add course.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (c: Course) => {
    setEditCourse(c);
    setName(c.name);
    setCode(c.code);
    setDepartmentId(c.departmentId);
    setFacultyName(c.facultyName ?? '');
  };

  const handleEdit = async () => {
    if (!editCourse) return;
    if (!name.trim() || !code.trim() || !departmentId) {
      toast.error('Course Name, Code, and Department are required.');
      return;
    }
    const dept = departments.find((d) => d.id === departmentId);
    if (!dept) {
      toast.error('Please select a valid department.');
      return;
    }
    setEditSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim(),
        departmentId: dept.id,
        departmentName: dept.name,
        facultyName: facultyName.trim() || undefined,
      };
      const updated = await adminApi.updateCourse(editCourse.id, payload);
      setCourses((prev) =>
        prev.map((c) => (c.id === editCourse.id ? updated : c)),
      );
      toast.success('Course updated.');
      setEditCourse(null);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to update course.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCourse) return;
    try {
      await adminApi.deleteCourse(deleteCourse.id);
      setCourses((prev) => prev.filter((c) => c.id !== deleteCourse.id));
      toast.success('Course deleted.');
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to delete course.');
    } finally {
      setDeleteCourse(null);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="h-4 w-4 opacity-20" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-primary" />
    ) : (
      <ChevronDown className="h-4 w-4 text-primary" />
    );
  };

  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: `${d.code} — ${d.name}`,
  }));

  return (
    <AppShell title="Courses">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage courses, codes, and department assignments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by course name, code, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

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
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-16 text-center">
                      #
                    </th>
                    <th
                      onClick={() => handleSort('name')}
                      className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Course Name <SortIcon col="name" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('departmentName')}
                      className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Department <SortIcon col="departmentName" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Faculty
                    </th>
                    <th
                      onClick={() => handleSort('enrolledCount')}
                      className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Enrolled <SortIcon col="enrolledCount" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pageData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-gray-200" />
                          </div>
                          <p className="text-gray-400 font-medium">
                            No courses found
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pageData.map((c, idx) => (
                      <tr
                        key={c.id}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4 text-xs font-mono text-gray-300 text-center">
                          {page * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shadow-sm">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">
                                {c.name}
                              </p>
                              <p className="text-[10px] uppercase font-bold text-gray-300 tracking-tighter">
                                {c.code}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                          {c.departmentName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                          {c.facultyName ?? '–'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                          {c.enrolledCount}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteCourse(c)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-400">
                Displaying{' '}
                <span className="text-gray-900">{pageData.length}</span> of{' '}
                <span className="text-gray-900">{filtered.length}</span> results
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-20 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1 mx-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${page === i ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-20 transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pageData.map((c) => (
              <div
                key={c.id}
                className="relative bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="p-2 text-gray-300 hover:text-primary transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteCourse(c)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h4 className="text-lg font-bold text-gray-900 truncate">
                  {c.name}
                </h4>
                <p className="text-xs text-gray-500 truncate mb-1">{c.code}</p>
                <p className="text-xs text-gray-500 truncate mb-4">
                  {c.departmentName}
                </p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-gray-400 font-medium">
                    Enrolled: {c.enrolledCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="fixed bottom-8 right-8">
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-bold shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="h-5 w-5" />
            Add Course
          </button>
        </div>
      </div>

      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Course"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={submitting}
              className="flex-2 px-8 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Course'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <FormInput
            label="Course Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            placeholder="e.g. Introduction to Programming"
          />
          <FormInput
            label="Course Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            fullWidth
            placeholder="e.g. CS101"
          />
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 transition-all outline-none"
            >
              <option value="">Select a department...</option>
              {departmentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <FormInput
            label="Faculty (optional)"
            value={facultyName}
            onChange={(e) => setFacultyName(e.target.value)}
            fullWidth
            placeholder="e.g. Dr. Smith"
          />
        </div>
      </Modal>

      <Modal
        isOpen={!!editCourse}
        onClose={() => setEditCourse(null)}
        title="Edit Course"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setEditCourse(null)}
              className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEdit}
              disabled={editSubmitting}
              className="flex-2 px-8 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg"
            >
              {editSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {editCourse && (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  Code
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {editCourse.code}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  Department
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {editCourse.departmentName}
                </span>
              </div>
            </div>
          )}
          <FormInput
            label="Course Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <FormInput
            label="Course Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            fullWidth
          />
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 transition-all outline-none"
            >
              <option value="">Select a department...</option>
              {departmentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <FormInput
            label="Faculty (optional)"
            value={facultyName}
            onChange={(e) => setFacultyName(e.target.value)}
            fullWidth
          />
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteCourse}
        onClose={() => setDeleteCourse(null)}
        title="Confirm Delete"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setDeleteCourse(null)}
              className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-xl shadow-red-100"
            >
              Delete Course
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center animate-pulse">
            <Trash2 className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-900">Are you sure?</h4>
            <p className="text-sm text-gray-500 mt-2 px-4 leading-relaxed">
              This will permanently delete the course{' '}
              <span className="font-bold text-gray-900">
                {deleteCourse?.code} — {deleteCourse?.name}
              </span>
              .
            </p>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
