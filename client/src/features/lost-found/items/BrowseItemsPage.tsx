import { SearchX } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BigSearchPill } from '@/components/shared/BigSearchPill';
import { HeroReportLink } from '@/components/shared/HeroReportLink';
import { SearchHero } from '@/components/shared/SearchHero';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ItemCard } from '@/features/lost-found/items/ItemCard';
import { ItemPagination } from '@/features/lost-found/items/ItemPagination';
import {
  EMPTY_ITEM_FILTERS,
  initialBrowseFilters,
  type ItemFilterState,
} from '@/features/lost-found/items/browseFilters';
import { ItemFilters } from '@/features/lost-found/items/ItemFilters';
import { useAuth } from '@/features/auth/AuthContext';
import { itemsApi } from '@/features/lost-found/items/itemsApi';
import { getErrorMessage } from '@/lib/api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

const PAGE_SIZE = 12;

export function BrowseItemsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Spec 003: SUPER_ADMIN does not get the report option anywhere.
  const canReport = user?.role !== 'SUPER_ADMIN';
  const [searchParams] = useSearchParams();
  // Spec 006: the home hero lands here with ?q= / ?category= applied.
  const [filters, setFilters] = useState<ItemFilterState>(() =>
    initialBrowseFilters(searchParams),
  );
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.q);

  const itemsQuery = useQuery({
    queryKey: ['lost-found-items', 'browse', { ...filters, q: debouncedSearch, page }],
    queryFn: () =>
      itemsApi.list({
        q: debouncedSearch || undefined,
        reportType: filters.reportType === 'ALL' ? undefined : filters.reportType,
        category: filters.category === 'ALL' ? undefined : filters.category,
        building: filters.building || undefined,
        color: filters.color || undefined,
        brand: filters.brand || undefined,
        status: filters.status === 'ALL' ? undefined : filters.status,
        scope: 'active',
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const updateFilters = (patch: Partial<ItemFilterState>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ ...EMPTY_ITEM_FILTERS });
    setPage(1);
  };

  const items = itemsQuery.data?.data ?? [];
  const total = itemsQuery.data?.total ?? 0;
  const hasActiveFilters =
    filters.q !== '' ||
    filters.reportType !== 'ALL' ||
    filters.category !== 'ALL' ||
    filters.building !== '' ||
    filters.color !== '' ||
    filters.brand !== '' ||
    filters.status !== 'ALL' ||
    filters.from !== '' ||
    filters.to !== '';

  const errorMessage = itemsQuery.error ? getErrorMessage(itemsQuery.error) : null;

  return (
    <div className="space-y-6">
      {/* Spec 006: search-first hero — the pill is bound live to the same
          search state the filters below used to own. */}
      <SearchHero
        subtitle={t('lostFound.browseSubtitle')}
        chipsValue={filters.category}
        onChipSelect={(category) => updateFilters({ category })}
      >
        <div className="mt-7">
          <BigSearchPill
            inputId="browse-hero-search"
            value={filters.q}
            onValueChange={(q) => updateFilters({ q })}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {canReport ? <HeroReportLink /> : null}
          <a
            href="#browse-results"
            className="inline-flex items-center rounded-full border-[1.5px] border-white/40 px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--mnu-navy))]"
          >
            {t('lostFound.heroBrowseCta')}
          </a>
        </div>
      </SearchHero>

      <ItemFilters
        values={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        hideSearch
        hideCategory
      />

      <div id="browse-results" className="scroll-mt-24 space-y-6">

      {itemsQuery.isLoading ? (
        <LoadingState label={t('common.loading')} />
      ) : errorMessage ? (
        <ErrorState
          title={t('errors.generic')}
          message={errorMessage}
          onRetry={() => void itemsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={hasActiveFilters ? t('lostFound.noReportsMatch') : t('lostFound.noReportsYet')}
          description={
            hasActiveFilters
              ? t('lostFound.tryBroaderSearch')
              : t('lostFound.whenReportedAppear')
          }
          action={
            hasActiveFilters ? (
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                {t('common.clearFilters')}
              </Button>
            ) : canReport ? (
              <Button asChild size="sm">
                <Link to="/lost-found/report">{t('lostFound.reportAnItem')}</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium tabular-nums text-muted-foreground">
              {t('lostFound.count', { count: total })}
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {t('lostFound.page', { page })}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>

          <ItemPagination
            page={page}
            limit={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
      </div>
    </div>
  );
}
