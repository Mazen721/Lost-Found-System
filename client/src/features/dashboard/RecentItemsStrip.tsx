import { ArrowLeft, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CategoryChip } from '@/components/shared/CategoryChip';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { tr } from '@/i18n/localize';
import { fmtDistanceToNow } from '@/lib/dateLocale';
import { getCategoryStyle } from '@/lib/categoryStyle';
import { cn } from '@/lib/utils';
import type { DashboardItemCard } from '@/types/dashboard';

interface RecentItemsStripProps {
  items: DashboardItemCard[];
  titleKey?: string;
  viewAllTo?: string;
}

/**
 * Photo-first strip of the most recently reported Lost & Found items,
 * shared by the Manager and Admin dashboards (and adapted for students).
 */
export function RecentItemsStrip({
  items,
  titleKey = 'dashboard.recentItems',
  viewAllTo = '/lost-found/items',
}: RecentItemsStripProps) {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <section aria-label={t(titleKey)} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">{t(titleKey)}</h2>
        <Link
          to={viewAllTo}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          {t('common.viewAll')}
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const style = getCategoryStyle(item.category);
          const FallbackIcon = style.icon;
          return (
            <Link
              key={item.id}
              to={`/lost-found/items/${item.id}`}
              className="group overflow-hidden rounded-2xl bg-card shadow-card transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div
                    className={cn(
                      'flex h-full w-full items-center justify-center',
                      style.tileClass,
                    )}
                  >
                    <FallbackIcon className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                )}
                <div className="absolute end-2.5 top-2.5">
                  <StatusBadge status={item.status} />
                </div>
              </div>

              <div className="space-y-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 text-sm font-bold text-foreground group-hover:text-primary">
                    {tr(item, 'itemTitle')}
                  </h3>
                  <span className="shrink-0 font-mono text-[11px] font-semibold text-primary">
                    <span dir="ltr">{item.reportNumber}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-muted-foreground">
                  <CategoryChip category={item.category} />
                  {item.building ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="line-clamp-1">{tr(item, 'building')}</span>
                    </span>
                  ) : null}
                  <span>{fmtDistanceToNow(item.createdAt, { addSuffix: true })}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
