import type { Session } from '../../types/index.ts';
import { format } from 'date-fns';
import { MapPin, Clock } from 'lucide-react';
import { cn } from '../../utils/cn.ts';

interface SessionCardProps {
  session: Session;
  onClick?: () => void;
  action?: React.ReactNode;
  className?: string;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-gray-100 text-gray-700',
  active: 'bg-success/15 text-success',
  ended: 'bg-gray-100 text-gray-500',
};

export function SessionCard({ session, onClick, action, className }: SessionCardProps) {
  const statusClass = statusColors[session.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{session.courseName}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{session.topic}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3" />
              {format(new Date(session.startTime), 'MMM d, HH:mm')}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3" />
              {session.classroomName}
            </span>
          </div>
          <span className={cn('inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium', statusClass)}>
            {session.status}
          </span>
        </div>
        {action}
      </div>
    </div>
  );
}
