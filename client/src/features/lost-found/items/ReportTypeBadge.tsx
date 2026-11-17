import { useTranslation } from 'react-i18next';
import { BADGE_OVERLAY_CLASSNAME } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { enumLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { ReportType } from '@/types/lostFound';

const REPORT_TYPE_STYLES: Record<ReportType, string> = {
  LOST: 'border-rose-300 bg-rose-50 text-rose-800',
  FOUND: 'border-teal-300 bg-teal-50 text-teal-900',
};

/**
 * Photo overlays follow Concept 1 (spec 006): «معثور عليه» is a solid gold
 * pill with navy text, «مفقود» keeps the spec 004 solid-navy shell. Both
 * stay readable over bright and dark photos, unlike the pastel defaults.
 */
const REPORT_TYPE_OVERLAY_STYLES: Record<ReportType, string> = {
  LOST: BADGE_OVERLAY_CLASSNAME,
  FOUND:
    'border-transparent bg-[hsl(var(--mnu-gold))] font-bold text-[hsl(var(--mnu-navy))] shadow-lg',
};

interface ReportTypeBadgeProps {
  reportType: ReportType;
  className?: string;
  /** 'overlay' renders the photo-safe solid treatment (ItemCard). */
  variant?: 'default' | 'overlay';
}

export function ReportTypeBadge({ reportType, className, variant = 'default' }: ReportTypeBadgeProps) {
  useTranslation();
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-semibold ltr:uppercase ltr:tracking-wide',
        variant === 'overlay'
          ? REPORT_TYPE_OVERLAY_STYLES[reportType]
          : REPORT_TYPE_STYLES[reportType],
        className,
      )}
    >
      {enumLabel('reportType', reportType)}
    </Badge>
  );
}
