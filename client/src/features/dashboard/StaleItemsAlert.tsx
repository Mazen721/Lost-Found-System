import { AlarmClock, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { shouldShowStaleAlert } from '@/features/dashboard/statisticsModel';
import { formatNumber } from '@/lib/utils';

/**
 * Compact stale-items alert for both staff dashboards (spec 011):
 * rendered only when at least one active report has had no movement
 * for 14+ days — at zero it renders nothing at all, so a healthy
 * board stays clean. The full list lives on the Statistics page.
 */
export function StaleItemsAlert({ staleCount }: { staleCount: number }) {
  const { t } = useTranslation();

  if (!shouldShowStaleAlert(staleCount)) return null;

  return (
    <Link
      to="/statistics"
      className="flex items-center gap-4 rounded-xl border border-amber-600/30 bg-amber-500/[0.08] p-4 shadow-xs transition-colors hover:bg-amber-500/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 sm:p-5"
    >
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-amber-500/[0.16] text-amber-800">
        <AlarmClock className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-foreground">
          {t('dashboard.staleTitle')}
        </span>
        <span className="block text-sm text-muted-foreground">
          {t('dashboard.staleAlertBody', { count: formatNumber(staleCount) })}
        </span>
      </span>
      <span className="flex flex-none items-center gap-1.5 text-sm font-bold text-amber-800">
        {t('dashboard.staleAlertCta')}
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
