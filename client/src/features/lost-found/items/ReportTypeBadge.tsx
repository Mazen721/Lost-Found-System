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

interface ReportTypeBadgeProps {
  reportType: ReportType;
  className?: string;
  /** 'overlay' renders the photo-safe solid-navy treatment (ItemCard). */
  variant?: 'default' | 'overlay';
}

export function ReportTypeBadge({ reportType, className, variant = 'default' }: ReportTypeBadgeProps) {
  useTranslation();
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-semibold ltr:uppercase ltr:tracking-wide',
        variant === 'overlay' ? BADGE_OVERLAY_CLASSNAME : REPORT_TYPE_STYLES[reportType],
        className,
      )}
    >
      {enumLabel('reportType', reportType)}
    </Badge>
  );
}
