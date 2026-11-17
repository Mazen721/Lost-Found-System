import { useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { ActivityChart } from '@/features/dashboard/ActivityChart';
import { RecoveryStatsCards } from '@/features/dashboard/RecoveryStatsCards';
import { StaleItemsSection } from '@/features/dashboard/StaleItemsSection';
import { ValueStatsCards } from '@/features/dashboard/ValueStatsCards';
import { dashboardApi } from '@/features/dashboard/dashboardApi';
import { useAuth } from '@/features/auth/AuthContext';
import { tr } from '@/i18n/localize';
import { getErrorMessage } from '@/lib/api';
import { enumLabel } from '@/lib/labels';
import { formatNumber } from '@/lib/utils';
import type { DashboardBreakdowns } from '@/types/dashboard';

interface BreakdownRow {
  key: string;
  label: string;
  detail?: string;
  value: number;
}

/** One labelled bar row: the fill is the value's share of the block max. */
function BreakdownBarList({ rows }: { rows: BreakdownRow[] }) {
  const max = rows.reduce((highest, row) => Math.max(highest, row.value), 0);

  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
            <span className="text-sm font-semibold text-foreground">{row.label}</span>
            <span className="flex items-baseline gap-2 text-xs text-muted-foreground">
              {row.detail ? <span>{row.detail}</span> : null}
              <strong className="text-sm font-bold tabular-nums text-foreground">
                {formatNumber(row.value)}
              </strong>
            </span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary/60"
            role="presentation"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${max > 0 ? (row.value / max) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: BreakdownRow[];
}) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border border-border/80 bg-card p-6 shadow-xs"
    >
      <h3 className="text-base font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </h3>
      <div className="mt-5">
        <BreakdownBarList rows={rows} />
      </div>
    </section>
  );
}

/** The category + status distribution blocks (spec 009). */
function BreakdownsSection({ breakdowns }: { breakdowns: DashboardBreakdowns }) {
  const { t } = useTranslation();

  const categoryRows: BreakdownRow[] = breakdowns.itemsByCategory.map((entry) => ({
    key: entry.category,
    label: enumLabel('lostFoundCategory', entry.category),
    detail: t('dashboard.breakdownLostFound', {
      lost: formatNumber(entry.lost),
      found: formatNumber(entry.found),
    }),
    value: entry.total,
  }));

  const statusRows: BreakdownRow[] = breakdowns.itemsByStatus.map((entry) => ({
    key: entry.status,
    label: enumLabel('status', entry.status),
    value: entry.count,
  }));

  return (
    <div className="grid items-start gap-7 lg:grid-cols-2">
      <BreakdownCard title={t('dashboard.itemsByCategory')} rows={categoryRows} />
      <BreakdownCard title={t('dashboard.statusDistribution')} rows={statusRows} />
    </div>
  );
}

/**
 * Hot locations (spec 011): the spec-009 top-5 locations with a
 * lost/found split bar per location and each location's server-side
 * share of ALL reports (the top-5 shares need not sum to 100%).
 */
function TopLocationsCard({
  locations,
}: {
  locations: DashboardBreakdowns['locationsTop'];
}) {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t('dashboard.breakdownsTopLocations')}
      className="rounded-xl border border-border/80 bg-card p-6 shadow-xs"
    >
      <h3 className="text-base font-semibold tracking-[-0.01em] text-foreground">
        {t('dashboard.breakdownsTopLocations')}
      </h3>
      <ul className="mt-5 space-y-4">
        {locations.map((entry) => (
          <li key={entry.locationId}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <span className="text-sm font-semibold text-foreground">
                {tr(entry, 'name') || entry.name}
              </span>
              <span className="flex items-baseline gap-2 text-xs text-muted-foreground">
                <span>
                  {t('dashboard.breakdownLostFound', {
                    lost: formatNumber(entry.lost),
                    found: formatNumber(entry.found),
                  })}
                  {' · '}
                  {t('dashboard.locationShare', {
                    share: formatNumber(entry.sharePercent, {
                      maximumFractionDigits: 1,
                    }),
                  })}
                </span>
                <strong className="text-sm font-bold tabular-nums text-foreground">
                  {formatNumber(entry.count)}
                </strong>
              </span>
            </div>
            <div
              className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-secondary/60"
              role="presentation"
            >
              <div
                className="h-full bg-primary"
                style={{
                  width: `${entry.count > 0 ? (entry.lost / entry.count) * 100 : 0}%`,
                }}
              />
              <div
                className="h-full bg-[hsl(var(--mnu-gold))]"
                style={{
                  width: `${entry.count > 0 ? (entry.found / entry.count) * 100 : 0}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {t('dashboard.locationsShareNote')}
      </p>
    </section>
  );
}

/**
 * Staff-only Statistics page (spec 009): the analytics that used to sit
 * on the dashboards — the activity time series, the estimated-value
 * cards, and the category/status/location breakdowns — gathered in one
 * place so the dashboards stay operational. Data comes from the same
 * staff-gated `GET /dashboard` payload plus the activity-series
 * endpoint; the route itself is restricted to Manager + Super Admin.
 */
export function StatisticsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', user?.id, user?.role, 'statistics'],
    queryFn: () => dashboardApi.get('all'),
    enabled: Boolean(user),
  });

  if (!user) return null;

  async function handleExport() {
    setExporting(true);
    try {
      const { blob, filename } = await dashboardApi.downloadMonthlyReport();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename ?? 'تقرير-المفقودات.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(t('dashboard.exportSuccess'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  const data =
    dashboardQuery.data &&
    (dashboardQuery.data.role === 'SUPER_ADMIN' ||
      dashboardQuery.data.role === 'LOST_FOUND_MANAGER')
      ? dashboardQuery.data
      : null;
  const errorMessage = dashboardQuery.error
    ? getErrorMessage(dashboardQuery.error)
    : null;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={t('nav.statistics')}
        title={t('dashboard.statisticsTitle')}
        description={t('dashboard.statisticsDesc')}
        actions={
          <Button type="button" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('dashboard.exportMonthlyReport')}
          </Button>
        }
      />

      {dashboardQuery.isLoading || (dashboardQuery.data && !data) ? (
        <LoadingState label={t('common.loading')} />
      ) : errorMessage ? (
        <ErrorState
          title={t('errors.generic')}
          message={errorMessage}
          onRetry={() => void dashboardQuery.refetch()}
        />
      ) : data ? (
        <>
          <ActivityChart />
          <ValueStatsCards stats={data.valueStats} />
          <RecoveryStatsCards stats={data.recoveryStats} />
          <BreakdownsSection breakdowns={data.breakdowns} />
          <TopLocationsCard locations={data.breakdowns.locationsTop} />
          <StaleItemsSection items={data.staleItems} staleCount={data.staleCount} />
        </>
      ) : null}
    </div>
  );
}
