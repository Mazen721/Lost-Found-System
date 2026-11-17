import { AlarmClock, MoonStar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { staleRemainder } from '@/features/dashboard/statisticsModel';
import { tr } from '@/i18n/localize';
import { enumLabel } from '@/lib/labels';
import { getCategoryStyle } from '@/lib/categoryStyle';
import { formatNumber } from '@/lib/utils';
import type { StaleItem } from '@/types/dashboard';

/**
 * Stale-items follow-up list on the Statistics page (spec 011): active
 * reports with no movement — no edit, no claim activity — for 14+ days,
 * oldest first. The payload list is capped server-side; when the full
 * count is higher, a remainder note points at the monthly export,
 * which carries the uncapped list.
 */
export function StaleItemsSection({
  items,
  staleCount,
}: {
  items: StaleItem[];
  staleCount: number;
}) {
  const { t } = useTranslation();
  const remainder = staleRemainder(staleCount, items.length);

  return (
    <section
      aria-label={t('dashboard.staleTitle')}
      className="rounded-xl border border-border/80 bg-card p-6 shadow-xs"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-amber-500/[0.14] text-amber-800">
          <AlarmClock className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="text-base font-semibold tracking-[-0.01em] text-foreground">
          {t('dashboard.staleTitle')}
        </h3>
        {staleCount > 0 ? (
          <span className="rounded-full bg-amber-500/[0.16] px-2.5 py-0.5 text-xs font-bold tabular-nums text-amber-900">
            {formatNumber(staleCount)}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 pb-2 text-center">
          <MoonStar className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">
            {t('dashboard.staleEmpty')}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-5 divide-y divide-border/70">
            {items.map((item) => {
              const FallbackIcon = getCategoryStyle(item.category).icon;
              return (
                <li key={item.id}>
                  <Link
                    to={`/lost-found/items/${item.id}`}
                    className="flex items-center gap-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FallbackIcon className="h-6 w-6" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-foreground">
                        {tr(item, 'itemTitle') || item.itemTitle}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.reportNumber} · {tr(item, 'building') || item.building} ·{' '}
                        {enumLabel('role', item.reporterRole)}
                      </span>
                    </span>
                    <StatusBadge status={item.status} />
                    <span className="flex-none rounded-full bg-amber-500/[0.14] px-2.5 py-1 text-xs font-bold tabular-nums text-amber-900">
                      {t('dashboard.staleAgeBadge', {
                        days: formatNumber(item.ageDays),
                      })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {remainder > 0 ? (
            <p className="mt-4 text-xs font-medium text-muted-foreground">
              {t('dashboard.staleRemainderNote', {
                count: formatNumber(remainder),
              })}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
