import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { enumLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';

interface StatusStyle {
  className: string;
  dotClassName: string;
  /** Dot color lightened so it stays visible on the dark overlay shell. */
  overlayDotClassName: string;
}

const EMERALD_STYLE: StatusStyle = {
  className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700',
  dotClassName: 'bg-emerald-600',
  overlayDotClassName: 'bg-emerald-400',
};

const GOLD_STYLE: StatusStyle = {
  className: 'border-amber-500/30 bg-amber-500/[0.12] text-amber-800',
  dotClassName: 'bg-amber-600',
  overlayDotClassName: 'bg-amber-400',
};

const NAVY_STYLE: StatusStyle = {
  className: 'border-primary/20 bg-primary/[0.08] text-primary',
  dotClassName: 'bg-primary',
  overlayDotClassName: 'bg-sky-300',
};

const CRIMSON_STYLE: StatusStyle = {
  className: 'border-destructive/25 bg-destructive/10 text-destructive',
  dotClassName: 'bg-destructive',
  overlayDotClassName: 'bg-red-400',
};

const MUTED_STYLE: StatusStyle = {
  className: 'border-border bg-secondary/60 text-muted-foreground',
  dotClassName: 'bg-muted-foreground/70',
  overlayDotClassName: 'bg-slate-300',
};

/**
 * Photo-safe shell for badges rendered over item photos: solid navy with
 * white text stays readable over bright and dark photos alike, where the
 * pastel default styles wash out. Shared with ReportTypeBadge's overlay.
 */
export const BADGE_OVERLAY_CLASSNAME =
  'border-white/25 bg-[#04153E]/90 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-sm';

const STATUS_STYLES: Record<string, StatusStyle> = {
  SUBMITTED: NAVY_STYLE,
  UNDER_REVIEW: GOLD_STYLE,
  APPROVED: EMERALD_STYLE,
  REJECTED: CRIMSON_STYLE,
  OVERDUE: CRIMSON_STYLE,
  IN_PROGRESS: GOLD_STYLE,
  COMPLETED: EMERALD_STYLE,
  CLOSED: MUTED_STYLE,
  REOPENED: GOLD_STYLE,
  PENDING_ASSIGNMENT: GOLD_STYLE,
  ASSIGNED: NAVY_STYLE,
  CANCELLED: MUTED_STYLE,
  OPEN: NAVY_STYLE,
  MATCH_CONFIRMED: EMERALD_STYLE,
  CLAIM_UNDER_REVIEW: GOLD_STYLE,
  APPROVED_FOR_HANDOVER: EMERALD_STYLE,
  RETURNED: EMERALD_STYLE,
  PENDING_REVIEW: GOLD_STYLE,
  UNDER_VERIFICATION: GOLD_STYLE,
  SUGGESTED: GOLD_STYLE,
  CONFIRMED: EMERALD_STYLE,
  DISMISSED: MUTED_STYLE,
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  /** 'overlay' renders the photo-safe solid-navy treatment (ItemCard). */
  variant?: 'default' | 'overlay';
}

export function StatusBadge({ status, className, variant = 'default' }: StatusBadgeProps) {
  useTranslation();
  const key = status.toUpperCase();
  const style = STATUS_STYLES[key] ?? NAVY_STYLE;
  const overlay = variant === 'overlay';

  return (
    <Badge
      variant="outline"
      className={cn('font-medium', overlay ? BADGE_OVERLAY_CLASSNAME : style.className, className)}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          overlay ? style.overlayDotClassName : style.dotClassName,
        )}
        aria-hidden="true"
      />
      {enumLabel('status', key)}
    </Badge>
  );
}
