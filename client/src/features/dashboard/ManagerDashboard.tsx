import { ActivityChart } from '@/features/dashboard/ActivityChart';
import { ManagerCharts } from '@/features/dashboard/ManagerCharts';
import { ManagerSummaryGrid } from '@/features/dashboard/ManagerSummaryGrid';
import { ManagerTriageLedgers } from '@/features/dashboard/ManagerTriageLedgers';
import { RecentItemsStrip } from '@/features/dashboard/RecentItemsStrip';
import { StaleItemsAlert } from '@/features/dashboard/StaleItemsAlert';
import { UrgentQueuePanel } from '@/features/dashboard/UrgentQueuePanel';
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
      {/* Spec 011: stale-items alert, only when staleCount > 0. */}
      <StaleItemsAlert staleCount={data.staleCount} />
      {/* Spec 009: the value cards moved to the Statistics page. */}
      <UrgentQueuePanel queue={data.urgentQueue} />
      <RecentItemsStrip items={data.recentItems} />
      <ActivityChart />
      <ManagerTriageLedgers counts={data.counts} />
      {data.analytics ? <ManagerCharts analytics={data.analytics} /> : null}
    </div>
  );
}
