import { BookOpen, CalendarDays, Star } from 'lucide-react';

interface StatsCardsProps {
  totalCourses: number;
  upcomingSessions: number;
  feedbackGiven: number;
}

export function StatsCards({ totalCourses, upcomingSessions, feedbackGiven }: StatsCardsProps) {
  const cards = [
    { label: 'Total Courses', value: totalCourses, icon: BookOpen, tone: 'text-blue-600 bg-blue-50' },
    { label: 'Upcoming Sessions', value: upcomingSessions, icon: CalendarDays, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Feedback Given', value: feedbackGiven, icon: Star, tone: 'text-amber-600 bg-amber-50' }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
            </div>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${card.tone}`}>
              <card.icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
