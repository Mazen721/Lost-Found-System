import { ManagerCharts } from '@/features/dashboard/ManagerCharts';
import { ManagerSummaryGrid } from '@/features/dashboard/ManagerSummaryGrid';
import { ManagerTriageLedgers } from '@/features/dashboard/ManagerTriageLedgers';
import type { ManagerDashboard as ManagerDashboardData } from '@/types/dashboard';

/**
 * Lost & Found Manager operational command board pairing four KPI cards,
 * a 12-column claims/matches triage & recovery pipeline bento row, and
 * a 2-column analytics row.
 */
export function ManagerDashboard({ data }: { data: ManagerDashboardData }) {
  return (
    <div className="space-y-7">
      <ManagerSummaryGrid counts={data.counts} />
      <ManagerTriageLedgers counts={data.counts} />
      {data.analytics ? <ManagerCharts analytics={data.analytics} /> : null}
    </div>
  );
}
