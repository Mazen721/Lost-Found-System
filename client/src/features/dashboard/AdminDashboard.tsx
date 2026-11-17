import { ActivityChart } from '@/features/dashboard/ActivityChart';
import { AdminCharts } from '@/features/dashboard/AdminCharts';
import { AdminGovernanceLedgers } from '@/features/dashboard/AdminGovernanceLedgers';
import { AdminSummaryGrid } from '@/features/dashboard/AdminSummaryGrid';
import { RecentItemsStrip } from '@/features/dashboard/RecentItemsStrip';
import { UrgentQueuePanel } from '@/features/dashboard/UrgentQueuePanel';
import type { AdminDashboard as AdminDashboardData } from '@/types/dashboard';

/**
 * Whole-system command board for Super Admins: executive domain monitors,
 * the same urgent Lost & Found queue and recent items the manager works
 * from, building/role analytics, and the governance ledgers.
 */
export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const { totals, analytics } = data;

  return (
    <div className="space-y-7">
      <AdminSummaryGrid totals={totals} />
      {/* Spec 009: the value cards moved to the Statistics page. */}
      <UrgentQueuePanel queue={data.urgentQueue} />
      <RecentItemsStrip items={data.recentItems} />
      <ActivityChart />
      {analytics ? <AdminCharts analytics={analytics} /> : null}
      <AdminGovernanceLedgers totals={totals} />
    </div>
  );
}
