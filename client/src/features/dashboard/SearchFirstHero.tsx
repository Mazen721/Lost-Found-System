import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { BigSearchPill } from '@/components/shared/BigSearchPill';
import type { CategorySelection } from '@/components/shared/CategoryChipsCard';
import { HeroReportLink } from '@/components/shared/HeroReportLink';
import { SearchHero } from '@/components/shared/SearchHero';
import {
  browsePathForCategory,
  browsePathForQuery,
} from '@/features/lost-found/items/browseFilters';

/**
 * Concept 1 «دوّر الأول» home hero (spec 006) for students and employees.
 * Search and chips do not filter in place; they route to Browse with the
 * query/category applied via the URL.
 */
export function SearchFirstHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const goToCategory = (category: CategorySelection) => {
    navigate(browsePathForCategory(category));
  };

  return (
    <SearchHero
      subtitle={t('lostFound.heroSubtitle')}
      chipsValue="ALL"
      onChipSelect={goToCategory}
    >
      <div className="mt-7">
        <BigSearchPill
          inputId="home-hero-search"
          value={query}
          onValueChange={setQuery}
          onSubmit={() => navigate(browsePathForQuery(query))}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <HeroReportLink />
        <Link
          to="/lost-found"
          className="inline-flex items-center rounded-full border-[1.5px] border-white/40 px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--mnu-navy))]"
        >
          {t('lostFound.heroBrowseCta')}
        </Link>
      </div>
    </SearchHero>
  );
}
