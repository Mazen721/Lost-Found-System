import {
  LOST_FOUND_CATEGORIES,
  type ItemStatus,
  type LostFoundCategory,
  type ReportType,
} from '@/types/lostFound';

export interface ItemFilterState {
  q: string;
  reportType: 'ALL' | ReportType;
  category: 'ALL' | LostFoundCategory;
  building: string;
  color: string;
  brand: string;
  status: 'ALL' | ItemStatus;
  from: string;
  to: string;
}

export const EMPTY_ITEM_FILTERS: ItemFilterState = {
  q: '',
  reportType: 'ALL',
  category: 'ALL',
  building: '',
  color: '',
  brand: '',
  status: 'ALL',
  from: '',
  to: '',
};

/**
 * Builds the Browse page's initial filter state from the URL — the landing
 * contract for the home hero (spec 006): its search submits `?q=` and its
 * category chips submit `?category=`. The URL is untrusted input, so an
 * unrecognised category falls back to ALL instead of reaching the API.
 */
export function initialBrowseFilters(searchParams: URLSearchParams): ItemFilterState {
  const categoryParam = searchParams.get('category');
  const category = LOST_FOUND_CATEGORIES.find((entry) => entry === categoryParam);

  return {
    ...EMPTY_ITEM_FILTERS,
    q: searchParams.get('q') ?? '',
    category: category ?? 'ALL',
  };
}

/** Home-hero search target: Browse with the typed query applied. */
export function browsePathForQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return '/lost-found';
  return `/lost-found?${new URLSearchParams({ q: trimmed }).toString()}`;
}

/** Home-hero category-chip target: Browse filtered to one category. */
export function browsePathForCategory(category: 'ALL' | LostFoundCategory): string {
  if (category === 'ALL') return '/lost-found';
  return `/lost-found?${new URLSearchParams({ category }).toString()}`;
}
