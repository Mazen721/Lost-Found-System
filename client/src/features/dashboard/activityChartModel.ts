import { formatDate } from '@/lib/utils';
import type { ActivityBucket } from '@/types/dashboard';

export type ActivitySeriesKey = 'lost' | 'found' | 'returned';

export interface ActivitySeriesStyle {
  key: ActivitySeriesKey;
  /** i18n key for the series label. */
  labelKey: string;
  /** Stroke/fill colour (rose = lost, amber/gold = found, emerald = returned). */
  color: string;
}

export const ACTIVITY_SERIES_STYLES: ActivitySeriesStyle[] = [
  { key: 'lost', labelKey: 'dashboard.activityLost', color: '#f43f5e' },
  { key: 'found', labelKey: 'dashboard.activityFound', color: '#f59e0b' },
  { key: 'returned', labelKey: 'dashboard.activityReturned', color: '#10b981' },
];

export interface ActivityTotals {
  lost: number;
  found: number;
  returned: number;
}

/** Header totals for the selected range, summed from the plotted buckets. */
export function summarizeActivity(buckets: ActivityBucket[]): ActivityTotals {
  return buckets.reduce<ActivityTotals>(
    (totals, bucket) => ({
      lost: totals.lost + bucket.lost,
      found: totals.found + bucket.found,
      returned: totals.returned + bucket.returned,
    }),
    { lost: 0, found: 0, returned: 0 },
  );
}

/** Parses a bucket's `yyyy-MM-dd` label as a local date (no UTC day shift). */
export function parseActivityBucketDate(bucket: ActivityBucket): Date {
  const [year = 1970, month = 1, day = 1] = bucket.date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Short axis label: `17 نوفمبر` for day buckets, `نوفمبر` for month buckets. */
export function formatActivityTick(
  bucket: ActivityBucket,
  granularity: 'day' | 'month',
): string {
  const date = parseActivityBucketDate(bucket);
  return granularity === 'month'
    ? formatDate(date, { month: 'long' })
    : formatDate(date, { day: 'numeric', month: 'short' });
}

/** Full tooltip heading: `17 نوفمبر 2026`, or `نوفمبر 2026` for a month bucket. */
export function formatActivityTooltipTitle(
  bucket: ActivityBucket,
  granularity: 'day' | 'month',
): string {
  const date = parseActivityBucketDate(bucket);
  return granularity === 'month'
    ? formatDate(date, { month: 'long', year: 'numeric' })
    : formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' });
}

export interface ActivityTooltipRow extends ActivitySeriesStyle {
  value: number;
}

/** The three labelled counts a tooltip shows for one bucket, in series order. */
export function buildActivityTooltipRows(
  bucket: ActivityBucket,
): ActivityTooltipRow[] {
  return ACTIVITY_SERIES_STYLES.map((style) => ({
    ...style,
    value: bucket[style.key],
  }));
}
