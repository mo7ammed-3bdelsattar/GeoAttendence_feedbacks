import { AppShell } from '../../components/layout/AppShell.tsx';

export function AdminOverviewPage() {

  return (
    <AppShell title="Overview">
      <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Dashboard</h3>
      </div>
    </AppShell>
  );
}
