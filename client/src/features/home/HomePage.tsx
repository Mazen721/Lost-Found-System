import { ArrowLeft, PackageSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CategoryChipsCard } from '@/components/shared/CategoryChipsCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ItemCard } from '@/features/lost-found/items/ItemCard';
import { browsePathForCategory } from '@/features/lost-found/items/browseFilters';
import { itemsApi } from '@/features/lost-found/items/itemsApi';
import { getErrorMessage } from '@/lib/api';

const LATEST_ITEMS_LIMIT = 8;

/**
 * The dedicated home page (spec 007) for students and employees — the
 * landing after login. The navbar + hero navy zone is rendered by the
 * shell; this page owns what sits below it: the category card overlapping
 * the zone's bottom edge and the «أحدث البلاغات» grid. The personal
 * dashboard lives on its own route (`/dashboard`).
 */
export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const itemsQuery = useQuery({
    queryKey: ['lost-found-items', 'home-latest'],
    queryFn: () => itemsApi.list({ scope: 'active', page: 1, limit: LATEST_ITEMS_LIMIT }),
  });

  const items = itemsQuery.data?.data ?? [];
  const errorMessage = itemsQuery.error ? getErrorMessage(itemsQuery.error) : null;

  return (
    <div className="pb-10">
      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <div className="-mt-8">
          <CategoryChipsCard
            value="ALL"
            onSelect={(category) => navigate(browsePathForCategory(category))}
          />
        </div>
      </div>

      <section
        aria-label={t('home.latestItems')}
        className="mx-auto w-full max-w-[1280px] px-4 sm:px-6"
      >
        <div className="mb-5 mt-9 flex items-baseline justify-between gap-3">
          <h2 className="text-2xl font-extrabold text-foreground">{t('home.latestItems')}</h2>
          <Link
            to="/lost-found"
            className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('common.viewAll')}
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>

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
            icon={PackageSearch}
            title={t('home.noItemsTitle')}
            description={t('home.noItemsDesc')}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
