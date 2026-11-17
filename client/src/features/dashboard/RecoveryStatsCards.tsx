import { History, PackageCheck, Percent, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  PortalSummaryGrid,
  type PortalSummaryMetric,
} from '@/features/dashboard/PortalSummaryGrid';
import { formatReturnRate } from '@/features/dashboard/statisticsModel';
import { formatNumber } from '@/lib/utils';
import type { RecoveryStats } from '@/types/dashboard';

/**
 * Staff-only recovery KPI cards (spec 011): how many items actually
 * made it back, what share of lost reports that represents, and how
 * long recovery and processing take. The rate is computed server-side
 * over linked recoveries only, so it can never exceed 100%; a null
 * rate (no lost reports yet) renders as a dash, never 0%.
 */
export function RecoveryStatsCards({ stats }: { stats: RecoveryStats }) {
  const { t } = useTranslation();
  const dayUnit = t('dashboard.dayUnit');
  const hasRecoverySample = stats.recoverySampleSize > 0;
  const hasClaimSample = stats.claimSampleSize > 0;

  const items: PortalSummaryMetric[] = [
    {
      key: 'total-returned',
      label: t('dashboard.totalReturned'),
      value: formatNumber(stats.returnedCount),
      hint: t('dashboard.returnedLinkedHint', {
        linked: formatNumber(stats.linkedReturnedCount),
        total: formatNumber(stats.totalLostReports),
      }),
      to: '/lost-found/handovers',
      icon: PackageCheck,
      accent: 'emerald',
      progress: stats.returnedCount > 0 ? 100 : 0,
    },
    {
      key: 'return-rate',
      label: t('dashboard.returnRate'),
      value: formatReturnRate(stats.returnRate),
      hint:
        stats.returnRate === null
          ? t('dashboard.returnRateNoData')
          : t('dashboard.returnRateHint'),
      to: '/lost-found/items',
      icon: Percent,
      accent: 'navy',
      progress: stats.returnRate !== null ? stats.returnRate * 100 : 0,
    },
    {
      key: 'avg-days-to-return',
      label: t('dashboard.avgDaysToReturn'),
      value: hasRecoverySample
        ? `${formatNumber(stats.averageDaysToReturn)} ${dayUnit}`
        : '—',
      hint: hasRecoverySample
        ? t('dashboard.avgReturnHint', {
            median: formatNumber(stats.medianDaysToReturn),
            count: formatNumber(stats.recoverySampleSize),
          })
        : t('dashboard.avgReturnNoData'),
      to: '/lost-found/handovers',
      icon: History,
      accent: 'gold',
      progress: hasRecoverySample ? 100 : 0,
    },
    {
      key: 'avg-processing',
      label: t('dashboard.avgProcessingTime'),
      value: hasClaimSample
        ? `${formatNumber(stats.averageDaysClaimToHandover)} ${dayUnit}`
        : '—',
      hint: hasClaimSample
        ? t('dashboard.avgProcessingHint', {
            count: formatNumber(stats.claimSampleSize),
          })
        : t('dashboard.avgProcessingNoData'),
      to: '/lost-found/claims',
      icon: Timer,
      accent: 'navy',
      progress: hasClaimSample ? 100 : 0,
    },
  ];

  return (
    <PortalSummaryGrid items={items} ariaLabel={t('dashboard.recoveryStatsTitle')} />
  );
}
