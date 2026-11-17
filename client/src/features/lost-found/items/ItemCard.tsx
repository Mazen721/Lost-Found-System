import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CategoryChip } from '@/components/shared/CategoryChip';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ReportTypeBadge } from '@/features/lost-found/items/ReportTypeBadge';
import { formatLocation, tr } from '@/i18n/localize';
import { fmtDistanceToNow } from '@/lib/dateLocale';
import { getCategoryStyle } from '@/lib/categoryStyle';
import { cn } from '@/lib/utils';
import type { LostFoundItem } from '@/types/lostFound';

interface ItemCardProps {
  item: LostFoundItem;
}

/**
 * Photo-first browse card: large item photo with the report-type and
 * status badges overlaid, a colored category chip with icon, location,
 * and the relative time since the item was reported.
 */
export function ItemCard({ item }: ItemCardProps) {
  const { t } = useTranslation();
  const image = item.images[0];
  const categoryStyle = getCategoryStyle(item.category);
  const FallbackIcon = categoryStyle.icon;

  return (
    <Link
      to={`/lost-found/items/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-card transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {image ? (
          <img
            src={image.url}
            alt={t('lostFound.itemPhoto', { title: tr(item, 'itemTitle') })}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full flex-col items-center justify-center gap-2',
              categoryStyle.tileClass,
            )}
          >
            <FallbackIcon className="h-12 w-12" strokeWidth={1.4} aria-hidden="true" />
            <span className="text-[11px] font-semibold">{t('lostFound.noPhoto')}</span>
          </div>
        )}
        <div className="absolute start-2.5 top-2.5">
          <ReportTypeBadge reportType={item.reportType} variant="overlay" />
        </div>
        <div className="absolute end-2.5 top-2.5">
          <StatusBadge status={item.status} variant="overlay" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] font-semibold text-primary">
            <span dir="ltr">{item.reportNumber}</span>
          </p>
          <h2 className="line-clamp-2 font-display text-lg font-bold leading-snug text-foreground group-hover:text-primary">
            {tr(item, 'itemTitle')}
          </h2>
          <CategoryChip category={item.category} />
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="line-clamp-2">
              {item.location ? formatLocation(item.location) : tr(item, 'locationDetails')}
            </span>
          </span>
          <span className="ms-auto shrink-0 font-medium">
            {fmtDistanceToNow(item.occurrenceDate, { addSuffix: true })}
          </span>
        </div>
      </div>
    </Link>
  );
}
