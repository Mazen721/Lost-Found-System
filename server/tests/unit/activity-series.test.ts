import { describe, expect, it } from 'vitest';
import {
  assembleActivitySeries,
  bucketizeDates,
  buildActivityBuckets,
} from '../../src/modules/dashboard/dashboard.service';
import type { ActivityRange } from '../../src/modules/dashboard/dashboard.validation';

// Fixed "now": Tuesday 17 Nov 2026, 15:30 local time.
const NOW = new Date(2026, 10, 17, 15, 30);

describe('buildActivityBuckets (spec 005)', () => {
  it.each([
    { range: 'week' as ActivityRange, count: 7, granularity: 'day', firstKey: '2026-11-11', lastKey: '2026-11-17' },
    { range: 'month' as ActivityRange, count: 30, granularity: 'day', firstKey: '2026-10-19', lastKey: '2026-11-17' },
    { range: 'year' as ActivityRange, count: 12, granularity: 'month', firstKey: '2025-12', lastKey: '2026-11' },
  ])(
    'builds $count contiguous $granularity buckets for range $range',
    ({ range, count, granularity, firstKey, lastKey }) => {
      const result = buildActivityBuckets(range, NOW);

      expect(result.granularity).toBe(granularity);
      expect(result.buckets).toHaveLength(count);
      expect(result.buckets[0]!.key).toBe(firstKey);
      expect(result.buckets[count - 1]!.key).toBe(lastKey);

      // Contiguous: each bucket starts exactly where the previous one ends.
      for (let index = 1; index < count; index += 1) {
        expect(result.buckets[index]!.start.getTime()).toBe(
          result.buckets[index - 1]!.end.getTime(),
        );
      }
    },
  );

  it('labels monthly buckets with the ISO date of their first day', () => {
    const { buckets } = buildActivityBuckets('year', NOW);
    expect(buckets[0]!.date).toBe('2025-12-01');
    expect(buckets[11]!.date).toBe('2026-11-01');
  });
});

describe('bucketizeDates (spec 005)', () => {
  const { buckets } = buildActivityBuckets('week', NOW);

  it('counts a date at the exact bucket start into that bucket', () => {
    const counts = bucketizeDates(buckets, [new Date(2026, 10, 11, 0, 0)]);
    expect(counts.get('2026-11-11')).toBe(1);
  });

  it('ignores dates before the window and at the exclusive window end', () => {
    const counts = bucketizeDates(buckets, [
      new Date(2026, 10, 10, 23, 59),
      new Date(2026, 10, 18, 0, 0),
    ]);
    expect(counts.size).toBe(0);
  });

  it('accumulates multiple dates in the same bucket', () => {
    const counts = bucketizeDates(buckets, [
      new Date(2026, 10, 17, 9, 0),
      new Date(2026, 10, 17, 23, 59),
      new Date(2026, 10, 12, 12, 0),
    ]);
    expect(counts.get('2026-11-17')).toBe(2);
    expect(counts.get('2026-11-12')).toBe(1);
  });
});

describe('assembleActivitySeries (spec 005)', () => {
  const { granularity, buckets } = buildActivityBuckets('week', NOW);

  it('zero-fills buckets with no recorded activity', () => {
    const series = assembleActivitySeries('week', granularity, buckets, {
      lost: new Map(),
      found: new Map(),
      returned: new Map(),
    });

    expect(series.buckets).toHaveLength(7);
    expect(
      series.buckets.every(
        (bucket) => bucket.lost === 0 && bucket.found === 0 && bucket.returned === 0,
      ),
    ).toBe(true);
    expect(series.totals).toEqual({ lost: 0, found: 0, returned: 0 });
  });

  it('places tallies in their buckets and sums the range totals', () => {
    const series = assembleActivitySeries('week', granularity, buckets, {
      lost: new Map([['2026-11-11', 2], ['2026-11-17', 1]]),
      found: new Map([['2026-11-17', 3]]),
      returned: new Map([['2026-11-15', 1]]),
    });

    expect(series.buckets[0]).toEqual({
      date: '2026-11-11',
      lost: 2,
      found: 0,
      returned: 0,
    });
    expect(series.buckets[6]).toEqual({
      date: '2026-11-17',
      lost: 1,
      found: 3,
      returned: 0,
    });
    expect(series.totals).toEqual({ lost: 3, found: 3, returned: 1 });
    expect(series.range).toBe('week');
    expect(series.granularity).toBe('day');
  });
});
