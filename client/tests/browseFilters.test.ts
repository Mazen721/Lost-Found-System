import { describe, expect, it } from 'vitest';
import {
  EMPTY_ITEM_FILTERS,
  browsePathForCategory,
  browsePathForQuery,
  initialBrowseFilters,
} from '../src/features/lost-found/items/browseFilters';

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe('initialBrowseFilters (spec 006)', () => {
  it('returns the empty filter state when the URL carries no parameters', () => {
    expect(initialBrowseFilters(params(''))).toEqual(EMPTY_ITEM_FILTERS);
  });

  it('applies the hero search query and leaves every other filter at its default', () => {
    const state = initialBrowseFilters(params('q=آيفون'));

    expect(state.q).toBe('آيفون');
    expect(state).toEqual({ ...EMPTY_ITEM_FILTERS, q: 'آيفون' });
  });

  it('applies a recognised category from a hero chip', () => {
    expect(initialBrowseFilters(params('category=Phones')).category).toBe('Phones');
  });

  it.each(['phones', 'Vehicles', 'ALL', ''])(
    'falls back to ALL for the unrecognised category value %j',
    (category) => {
      expect(initialBrowseFilters(params(`category=${category}`)).category).toBe('ALL');
    },
  );

  it('ignores parameters that are not part of the hero landing contract', () => {
    const state = initialBrowseFilters(params('page=3&status=OPEN&reportType=LOST'));

    expect(state).toEqual(EMPTY_ITEM_FILTERS);
  });
});

describe('home hero navigation targets (spec 006)', () => {
  it.each([
    ['', '/lost-found'],
    ['   ', '/lost-found'],
    ['wallet', '/lost-found?q=wallet'],
  ])('builds the browse path for query %j', (query, expected) => {
    expect(browsePathForQuery(query)).toBe(expected);
  });

  it('percent-encodes an Arabic query so it survives the URL round-trip', () => {
    const path = browsePathForQuery('آيفون 13');

    expect(path.startsWith('/lost-found?q=')).toBe(true);
    expect(new URLSearchParams(path.split('?')[1]).get('q')).toBe('آيفون 13');
  });

  it.each([
    ['ALL', '/lost-found'],
    ['Phones', '/lost-found?category=Phones'],
    ['Documents', '/lost-found?category=Documents'],
  ] as const)('builds the browse path for category %s', (category, expected) => {
    expect(browsePathForCategory(category)).toBe(expected);
  });
});
