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
    GraduationCap,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { Modal } from '../../components/Modal/index.ts';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { enrollmentApi, adminApi } from '../../services/api.ts';
import type { Enrollment, User } from '../../types/index.ts';
import toast from 'react-hot-toast';

type SortKey = 'courseName' | 'studentId' | 'enrolledAt';

const PAGE_SIZE = 10;

export function AdminEnrollmentsPage() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('courseName');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(0);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const [addOpen, setAddOpen] = useState(false);
    const [addStudentId, setAddStudentId] = useState('');
    const [addCourseId, setAddCourseId] = useState('');
    const [addCourseName, setAddCourseName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [editEnrollment, setEditEnrollment] = useState<Enrollment | null>(null);
    const [editCourseName, setEditCourseName] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);

    const [deleteEnrollment, setDeleteEnrollment] = useState<Enrollment | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eData, sData] = await Promise.all([
                enrollmentApi.getEnrollments(),
                adminApi.getUsers('student')
            ]);
            setEnrollments(eData || []);
            setStudents(sData || []);
        } catch (err: any) {
            console.error('Failed to fetch data:', err);
            toast.error('Failed to load enrollments.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filtered = useMemo(() => {
        let list = [...enrollments];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(e =>
                (e.courseName.toLowerCase()).includes(q) ||
                (e.studentId.toLowerCase()).includes(q)
            );
        }
        list.sort((a, b) => {
            const aVal = String(a[sortKey] || '').toLowerCase();
            const bVal = String(b[sortKey] || '').toLowerCase();
            return aVal.localeCompare(bVal) * (sortDir === 'asc' ? 1 : -1);
        });
        return list;
    }, [enrollments, search, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageData = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortKey(key); setSortDir('asc'); }
        setPage(0);
    };

    const handleAdd = async () => {
        if (!addStudentId.trim() || !addCourseId.trim() || !addCourseName.trim()) {
            toast.error('All fields are required.');
            return;
        }
        setSubmitting(true);
        try {
            const newE = await enrollmentApi.enrollStudent(addStudentId, addCourseId, addCourseName);
            setEnrollments((prev) => [...prev, newE]);
            toast.success('Student enrolled successfully');
            setAddOpen(false);
            setAddStudentId(''); setAddCourseId(''); setAddCourseName('');
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to enroll student.');
        } finally {
            setSubmitting(false);
        }
    };

    const openEdit = (e: Enrollment) => {
        setEditEnrollment(e);
        setEditCourseName(e.courseName);
    };

    const handleEdit = async () => {
        if (!editEnrollment) return;
        setEditSubmitting(true);
        try {
            const updated = await enrollmentApi.updateEnrollment(editEnrollment.id, {
                courseName: editCourseName,
            });
            setEnrollments((prev) => prev.map((e) => e.id === editEnrollment.id ? { ...e, ...updated } : e));
            toast.success('Enrollment updated.');
            setEditEnrollment(null);
        } catch {
            toast.error('Failed to update enrollment.');
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteEnrollment) return;
        try {
            await enrollmentApi.unenrollStudent(deleteEnrollment.id);
            setEnrollments((prev) => prev.filter((e) => e.id !== deleteEnrollment.id));
            toast.success('Student unenrolled.');
        } catch {
            toast.error('Unenrollment failed.');
        } finally {
            setDeleteEnrollment(null);
        }
    };

    const getStudentName = (id: string) => {
        const s = students.find(s => s.id === id);
        return s ? s.name : id;
    };

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ChevronUp className="h-4 w-4 opacity-20" />;
        return sortDir === 'asc'
            ? <ChevronUp className="h-4 w-4 text-primary" />
            : <ChevronDown className="h-4 w-4 text-primary" />;
    };

    return (
        <AppShell title="Course Enrollments">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Enrollment Management</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage student course assignments.</p>
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
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by course name or student ID..."
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
                                        <th onClick={() => handleSort('courseName')} className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors">
                                            <div className="flex items-center gap-2">Course Name <SortIcon col="courseName" /></div>
                                        </th>
                                        <th onClick={() => handleSort('studentId')} className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors">
                                            <div className="flex items-center gap-2">Student <SortIcon col="studentId" /></div>
                                        </th>
                                        <th onClick={() => handleSort('enrolledAt')} className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors">
                                            <div className="flex items-center gap-2">Enrolled At <SortIcon col="enrolledAt" /></div>
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {pageData.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-24 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                                        <BookOpen className="h-8 w-8 text-gray-200" />
                                                    </div>
                                                    <p className="text-gray-400 font-medium">No enrollments found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        pageData.map((e, idx) => (
                                            <tr key={e.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4 text-xs font-mono text-gray-300 text-center">{(page * PAGE_SIZE) + idx + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shadow-sm">
                                                            <BookOpen className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-sm">{e.courseName}</p>
                                                            <p className="text-[10px] uppercase font-bold text-gray-300 tracking-tighter">CID: {e.courseId}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <GraduationCap className="h-4 w-4 text-gray-400" />
                                                        <span className="text-sm font-medium text-gray-900">{getStudentName(e.studentId)}</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 ml-6">UID: {e.studentId.substring(0, 8)}...</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                                    {new Date(e.enrolledAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => openEdit(e)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={() => setDeleteEnrollment(e)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {pageData.map((e) => (
                            <div key={e.id} className="relative bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold">
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openEdit(e)} className="p-2 text-gray-300 hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                                        <button onClick={() => setDeleteEnrollment(e)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 truncate">{e.courseName}</h4>
                                <p className="text-xs text-gray-500 truncate mb-4">{getStudentName(e.studentId)}</p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-[10px] text-gray-400 font-medium">Enrolled: {new Date(e.enrolledAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="fixed bottom-8 right-8">
                    <button
                        onClick={() => setAddOpen(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-bold shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus className="h-5 w-5" />
                        Enroll Student
                    </button>
                </div>
            </div>

            <Modal
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                title="Enroll Student in Course"
                footer={
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setAddOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all">Cancel</button>
                        <button onClick={handleAdd} disabled={submitting} className="flex-2 px-8 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50">
                            {submitting ? 'Enrolling...' : 'Confirm Enrollment'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4 py-2">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Student Selection</label>
                        <select
                            value={addStudentId}
                            onChange={(e) => setAddStudentId(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                        >
                            <option value="">Select a student...</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                            ))}
                        </select>
                    </div>
                    <FormInput label="Course ID" value={addCourseId} onChange={(e) => setAddCourseId(e.target.value)} fullWidth placeholder="e.g. CS101" />
                    <FormInput label="Course Name" value={addCourseName} onChange={(e) => setAddCourseName(e.target.value)} fullWidth placeholder="e.g. Intro to Computer Science" />
                </div>
            </Modal>

            <Modal
                isOpen={!!editEnrollment}
                onClose={() => setEditEnrollment(null)}
                title="Edit Enrollment"
                footer={
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setEditEnrollment(null)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleEdit} disabled={editSubmitting} className="flex-2 px-8 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg">
                            {editSubmitting ? 'Updating...' : 'Save Changes'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4 py-2">
                    {editEnrollment && (
                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Student</span>
                                <span className="text-sm font-bold text-gray-900">{getStudentName(editEnrollment.studentId)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-gray-400">Course ID</span>
                                <span className="text-sm font-bold text-gray-900">{editEnrollment.courseId}</span>
                            </div>
                        </div>
                    )}
                    <FormInput label="Course Name" value={editCourseName} onChange={(e) => setEditCourseName(e.target.value)} fullWidth />
                </div>
            </Modal>

            <Modal
                isOpen={!!deleteEnrollment}
                onClose={() => setDeleteEnrollment(null)}
                title="Confirm Unenrollment"
                footer={
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setDeleteEnrollment(null)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
                        <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-xl shadow-red-100">Unenroll Student</button>
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
                            This will remove <span className="font-bold text-gray-900">{getStudentName(deleteEnrollment?.studentId || '')}</span> from
                            the course <span className="font-bold text-gray-900">{deleteEnrollment?.courseName}</span>.
                        </p>
                    </div>
                </div>
            </Modal>
        </AppShell>
    );
}
