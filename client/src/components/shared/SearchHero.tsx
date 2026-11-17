import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CategoryChipsCard,
  type CategorySelection,
} from '@/components/shared/CategoryChipsCard';

interface SearchHeroProps {
  subtitle: string;
  chipsValue: CategorySelection;
  onChipSelect: (category: CategorySelection) => void;
  /** The hero's search pill and action row, supplied by each surface. */
  children: ReactNode;
}

/**
 * The Concept 1 search-first hero block (spec 006), shared by the home
 * and Browse surfaces: deep-navy section with the «دوّر عليها هنا»
 * headline, the surface's own search/actions as children, and the white
 * category card overlapping the hero's bottom edge.
 */
export function SearchHero({ subtitle, chipsValue, onChipSelect, children }: SearchHeroProps) {
  const { t } = useTranslation();

  return (
    <div>
      <section className="bg-hero-concept overflow-hidden rounded-3xl px-5 pb-16 pt-9 text-center text-white shadow-hero sm:px-8 sm:pt-11">
        <h1 className="text-[32px] font-black leading-[1.3] tracking-[-0.01em] sm:text-4xl lg:text-[44px]">
          {t('lostFound.heroHeadlineStart')}{' '}
          <span className="text-[hsl(var(--mnu-gold))]">{t('lostFound.heroHeadlineAccent')}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-[15px] font-semibold leading-relaxed text-white/75 sm:text-lg">
          {subtitle}
        </p>
        {children}
      </section>

      <div className="relative z-10 mx-3 -mt-8 sm:mx-6">
        <CategoryChipsCard value={chipsValue} onSelect={onChipSelect} />
      </div>
    </div>
  );
}
