import { Calendar, Clock, MapPin } from 'lucide-react';

export interface StudentSessionItem {
  id: string;
  courseName: string;
  classroom: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface SessionsListProps {
  title: string;
  loading?: boolean;
  sessions: StudentSessionItem[];
  emptyText: string;
}

export function SessionsList({ title, loading = false, sessions, emptyText }: SessionsListProps) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 rounded-xl bg-gray-100" />
          <div className="h-16 rounded-xl bg-gray-100" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{session.courseName}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(session.date).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {session.startTime} - {session.endTime}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {session.classroom}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
