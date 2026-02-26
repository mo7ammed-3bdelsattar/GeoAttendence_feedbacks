import type { AttendanceStatus } from '../../types/index.ts';
import { cn } from '../../utils/cn.ts';

const statusConfig: Record<AttendanceStatus, { label: string; className: string }> = {
  present: { label: 'Present', className: 'bg-success/15 text-success' },
  absent: { label: 'Absent', className: 'bg-danger/15 text-danger' },
  late: { label: 'Late', className: 'bg-secondary/15 text-secondary' },
  excused: { label: 'Excused', className: 'bg-gray-100 text-gray-600' },
};

interface AttendanceBadgeProps {
  status: AttendanceStatus;
  className?: string;
}

export function AttendanceBadge({ status, className }: AttendanceBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.absent;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', config.className, className)}>
      {config.label}
    </span>
  );
}
