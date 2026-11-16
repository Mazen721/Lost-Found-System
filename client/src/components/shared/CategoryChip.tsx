import { getCategoryStyle } from '@/lib/categoryStyle';
import { enumLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';

interface CategoryChipProps {
  category: string;
  className?: string;
}

/**
 * Colored category chip with the category's Lucide icon, used on item
 * cards, dashboard recent items, and detail headers.
 */
export function CategoryChip({ category, className }: CategoryChipProps) {
  const style = getCategoryStyle(category);
  const Icon = style.icon;

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset',
        style.chipClass,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      {enumLabel('lostFoundCategory', category)}
    </span>
  );
}
