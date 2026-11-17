import { LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { enumLabel } from '@/lib/labels';
import { getCategoryStyle } from '@/lib/categoryStyle';
import { cn } from '@/lib/utils';
import { LOST_FOUND_CATEGORIES, type LostFoundCategory } from '@/types/lostFound';

export type CategorySelection = 'ALL' | LostFoundCategory;

interface CategoryChipsCardProps {
  value: CategorySelection;
  onSelect: (category: CategorySelection) => void;
}

const CHIP_BASE_CLASS =
  'inline-flex flex-none items-center gap-2 rounded-full border-[1.5px] px-[18px] py-2.5 text-[15px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * The Concept 1 floating category card (spec 006): a white rounded card
 * that overlaps the navy hero's bottom edge, holding one chip per
 * category with its icon. The active chip is solid navy with a gold icon;
 * the row scrolls sideways when it cannot fit (mobile swipe row).
 */
export function CategoryChipsCard({ value, onSelect }: CategoryChipsCardProps) {
  const { t } = useTranslation();

  const chipClass = (selected: boolean) =>
    cn(
      CHIP_BASE_CLASS,
      selected
        ? 'border-primary bg-primary text-white'
        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
    );
  const iconClass = (selected: boolean) =>
    cn('h-[18px] w-[18px] shrink-0', selected ? 'text-[hsl(var(--mnu-gold))]' : 'text-[#8494AC]');

  return (
    <div className="rounded-[20px] bg-card p-3 shadow-float sm:px-4">
      <div
        role="group"
        aria-label={t('lostFound.filterByCategory')}
        className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          aria-pressed={value === 'ALL'}
          onClick={() => onSelect('ALL')}
          className={chipClass(value === 'ALL')}
        >
          <LayoutGrid className={iconClass(value === 'ALL')} aria-hidden="true" />
          {t('common.all')}
        </button>
        {LOST_FOUND_CATEGORIES.map((category) => {
          const Icon = getCategoryStyle(category).icon;
          const selected = value === category;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(category)}
              className={chipClass(selected)}
            >
              <Icon className={iconClass(selected)} aria-hidden="true" />
              {enumLabel('lostFoundCategory', category)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
