import { ChevronLeft, Clock, MapPin } from 'lucide-react';
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
 * Photo-first browse card in the Concept 1 layout (spec 006): large item
 * photo with the report-type and status badges overlaid, then title,
 * location and relative-time meta rows, and a footer carrying the
 * category chip and a «التفاصيل» affordance. The report number stays
 * above the title — staff and students reference items by it, which the
 * concept mockup did not need to show.
 */
export function ItemCard({ item }: ItemCardProps) {
  const { t } = useTranslation();
  const image = item.images[0];
  const categoryStyle = getCategoryStyle(item.category);
  const FallbackIcon = categoryStyle.icon;

  return (
    <Link
      to={`/lost-found/items/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-item transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

      <div className="flex flex-1 flex-col p-4">
        <p className="font-mono text-[11px] font-semibold text-primary">
          <span dir="ltr">{item.reportNumber}</span>
        </p>
        <h2 className="mt-1.5 line-clamp-2 font-display text-[17px] font-bold leading-snug text-foreground group-hover:text-primary">
          {tr(item, 'itemTitle')}
        </h2>

        <div className="mb-3 mt-2.5 space-y-1.5 text-[13.5px] font-semibold text-muted-foreground">
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-[15px] w-[15px] shrink-0 text-[#9AA9BF]" aria-hidden="true" />
            <span className="line-clamp-2">
              {item.location ? formatLocation(item.location) : tr(item, 'locationDetails')}
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <Clock className="h-[15px] w-[15px] shrink-0 text-[#9AA9BF]" aria-hidden="true" />
            <span>{fmtDistanceToNow(item.occurrenceDate, { addSuffix: true })}</span>
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <CategoryChip category={item.category} />
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[13.5px] font-extrabold text-[hsl(var(--mnu-gold-ink))]">
            {t('common.details')}
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
