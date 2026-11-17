import { PackageCheck, PackageSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  PortalSummaryGrid,
  type PortalSummaryMetric,
} from '@/features/dashboard/PortalSummaryGrid';
import { formatNumber } from '@/lib/utils';
import type { ValueStats } from '@/types/dashboard';

/**
 * Staff-only estimated-value KPI cards (spec 008): what was lost this
 * month vs what was handed back, in EGP. All figures are estimates —
 * the hints carry the «تقديرية» wording, and no recovery percentage is
 * ever derived (the lost and returned populations are not the same
 * items). Rendered only on Admin/Manager dashboards; the student
 * payload never contains valueStats.
 */
export function ValueStatsCards({ stats }: { stats: ValueStats }) {
  const { t } = useTranslation();

  const items: PortalSummaryMetric[] = [
    {
      key: 'lost-value-this-month',
      label: t('dashboard.lostValueThisMonth'),
      value: `${formatNumber(stats.lostValueThisMonthEGP)} ${t('lostFound.egpSuffix')}`,
      hint: t('dashboard.valueAllTimeHint', {
        value: formatNumber(stats.totalLostValueEGP),
      }),
      to: '/lost-found/items',
      icon: PackageSearch,
      accent: 'gold',
      progress: stats.totalLostValueEGP > 0 ? 100 : 0,
    },
    {
      key: 'returned-value-this-month',
      label: t('dashboard.returnedValueThisMonth'),
      value: `${formatNumber(stats.returnedValueThisMonthEGP)} ${t('lostFound.egpSuffix')}`,
      hint: t('dashboard.valueAllTimeHint', {
        value: formatNumber(stats.totalReturnedValueEGP),
      }),
      to: '/lost-found/handovers',
      icon: PackageCheck,
      accent: 'emerald',
      progress: stats.totalReturnedValueEGP > 0 ? 100 : 0,
    },
  ];

  return <PortalSummaryGrid items={items} ariaLabel={t('dashboard.valueStatsTitle')} />;
}
