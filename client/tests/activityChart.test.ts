import { describe, expect, it } from 'vitest';
import {
  buildActivityTooltipRows,
  formatActivityTick,
  formatActivityTooltipTitle,
  summarizeActivity,
} from '../src/features/dashboard/activityChartModel';
import type { ActivityBucket } from '../src/types/dashboard';

function bucket(overrides: Partial<ActivityBucket> = {}): ActivityBucket {
  return { date: '2026-11-17', lost: 0, found: 0, returned: 0, ...overrides };
}

describe('summarizeActivity (spec 005)', () => {
  it('sums the three series across buckets for the header totals', () => {
    const totals = summarizeActivity([
      bucket({ lost: 2, found: 1, returned: 0 }),
      bucket({ date: '2026-11-16', lost: 1, found: 3, returned: 2 }),
      bucket({ date: '2026-11-15' }),
    ]);

    expect(totals).toEqual({ lost: 3, found: 4, returned: 2 });
  });

  it('returns zeros for an empty series', () => {
    expect(summarizeActivity([])).toEqual({ lost: 0, found: 0, returned: 0 });
  });
});

describe('activity bucket labels (spec 005)', () => {
  it('formats day buckets as day + short month and month buckets as month name', () => {
    const dayBucket = bucket({ date: '2026-11-17' });
    const monthBucket = bucket({ date: '2026-11-01' });

    expect(formatActivityTick(dayBucket, 'day')).toBe('17 نوفمبر');
    expect(formatActivityTick(monthBucket, 'month')).toBe('نوفمبر');
  });

  it('formats tooltip titles with the full date or month + year', () => {
    expect(formatActivityTooltipTitle(bucket({ date: '2026-11-17' }), 'day')).toBe(
      '17 نوفمبر 2026',
    );
    expect(
      formatActivityTooltipTitle(bucket({ date: '2026-11-01' }), 'month'),
    ).toBe('نوفمبر 2026');
  });
});

describe('buildActivityTooltipRows (spec 005)', () => {
  it('returns lost, found and returned rows in series order with values and colours', () => {
    const rows = buildActivityTooltipRows(
      bucket({ lost: 4, found: 2, returned: 1 }),
    );

    expect(rows.map((row) => row.key)).toEqual(['lost', 'found', 'returned']);
    expect(rows.map((row) => row.value)).toEqual([4, 2, 1]);
    expect(rows.map((row) => row.labelKey)).toEqual([
      'dashboard.activityLost',
      'dashboard.activityFound',
      'dashboard.activityReturned',
    ]);
    expect(new Set(rows.map((row) => row.color)).size).toBe(3);
  });
});
