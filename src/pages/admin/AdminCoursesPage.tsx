import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { DataTable, type Column } from '../../components/ui/DataTable.tsx';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton.tsx';
import { adminApi } from '../../services/api.ts';
import type { Course } from '../../types/index.ts';

export function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getCourses()
      .then((rows) => setCourses(rows ?? []))
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load courses');
      })
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<Course>[] = [
    { id: 'code', header: 'Code', accessor: (r) => r.code, sortable: true },
    { id: 'name', header: 'Course', accessor: (r) => r.name, sortable: true },
    { id: 'department', header: 'Department', accessor: (r) => r.departmentName },
    { id: 'faculty', header: 'Faculty', accessor: (r) => r.facultyName ?? '–' },
    { id: 'enrolled', header: 'Enrolled', accessor: (r) => r.enrolledCount },
  ];

  if (loading) {
    return (
      <AppShell title="Courses">
        <TableSkeleton rows={5} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Courses">
      <DataTable columns={columns} data={courses} keyExtractor={(r) => r.id} />
    </AppShell>
  );
}