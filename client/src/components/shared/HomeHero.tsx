import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { BigSearchPill } from '@/components/shared/BigSearchPill';
import { HeroReportLink } from '@/components/shared/HeroReportLink';
import { browsePathForQuery } from '@/features/lost-found/items/browseFilters';

/**
 * The home page hero (spec 007): rendered by the shell inside the navy
 * zone that starts with the navbar, so the two read as one continuous
 * block exactly as in the approved mockup — no card, no top margin.
 * Search submits to Browse with the query applied (spec 006 behaviour);
 * the category card that overlaps the zone's bottom edge belongs to the
 * home page itself.
 */
export function HomeHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  return (
    <section className="px-5 pb-16 pt-6 text-center text-white sm:px-8 sm:pt-9">
      <h1 className="text-[32px] font-black leading-[1.3] tracking-[-0.01em] sm:text-4xl lg:text-[44px]">
        {t('lostFound.heroHeadlineStart')}{' '}
        <span className="text-[hsl(var(--mnu-gold))]">{t('lostFound.heroHeadlineAccent')}</span>
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-[15px] font-semibold leading-relaxed text-white/75 sm:text-lg">
        {t('lostFound.heroSubtitle')}
      </p>

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
    </section>
  );
}
