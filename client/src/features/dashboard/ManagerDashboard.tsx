import { ActivityChart } from '@/features/dashboard/ActivityChart';
import { ManagerCharts } from '@/features/dashboard/ManagerCharts';
import { ManagerSummaryGrid } from '@/features/dashboard/ManagerSummaryGrid';
import { ManagerTriageLedgers } from '@/features/dashboard/ManagerTriageLedgers';
import { RecentItemsStrip } from '@/features/dashboard/RecentItemsStrip';
import { UrgentQueuePanel } from '@/features/dashboard/UrgentQueuePanel';
import { ValueStatsCards } from '@/features/dashboard/ValueStatsCards';
import type { ManagerDashboard as ManagerDashboardData } from '@/types/dashboard';

/**
 * Lost & Found Manager operational command board: KPI cards, the urgent
 * triage queue, the newest reported items with photos, the claims/matches
 * triage ledgers, and the analytics row.
 */
export function ManagerDashboard({ data }: { data: ManagerDashboardData }) {
  return (
    <div className="space-y-7">
      <ManagerSummaryGrid counts={data.counts} />
      <ValueStatsCards stats={data.valueStats} />
      <UrgentQueuePanel queue={data.urgentQueue} />
      <RecentItemsStrip items={data.recentItems} />
      <ActivityChart />
      <ManagerTriageLedgers counts={data.counts} />
      {data.analytics ? <ManagerCharts analytics={data.analytics} /> : null}
    </div>
  );
}
