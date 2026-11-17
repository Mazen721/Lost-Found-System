import { describe, expect, it } from 'vitest';
import {
  handoverInstant,
  selectCanonicalReturns,
  summarizeRecovery,
  type CanonicalClaim,
} from '../../src/modules/dashboard/dashboard.service';

const DAY = 86_400_000;
const T0 = new Date('2026-11-01T10:00:00.000Z');
const at = (days: number) => new Date(T0.getTime() + days * DAY);

function claim(overrides: Partial<CanonicalClaim> = {}): CanonicalClaim {
  return {
    _id: 'claim-1',
    itemId: 'item-1',
    linkedLostItemId: null,
    handover: { handedOverAt: at(1) },
    updatedAt: at(1),
    createdAt: T0,
    ...overrides,
  };
}

describe('handoverInstant (spec 011)', () => {
  it('prefers the recorded handover time over updatedAt', () => {
    const doc = claim({ handover: { handedOverAt: at(3) }, updatedAt: at(9) });
    expect(handoverInstant(doc)).toEqual(at(3));
  });

  it('falls back to updatedAt for legacy claims without a handover record', () => {
    const doc = claim({ handover: null, updatedAt: at(7) });
    expect(handoverInstant(doc)).toEqual(at(7));
  });
});

describe('selectCanonicalReturns (spec 011)', () => {
  it('keeps the earliest handover per claimed item', () => {
    const early = claim({ _id: 'a', handover: { handedOverAt: at(2) } });
    const late = claim({ _id: 'b', handover: { handedOverAt: at(5) } });
    expect(selectCanonicalReturns([late, early])).toEqual([early]);
  });

  it('counts one return when two found items are claimed against one lost report', () => {
    const first = claim({
      _id: 'a',
      itemId: 'found-1',
      linkedLostItemId: 'lost-1',
      handover: { handedOverAt: at(2) },
    });
    const duplicate = claim({
      _id: 'b',
      itemId: 'found-2',
      linkedLostItemId: 'lost-1',
      handover: { handedOverAt: at(3) },
    });
    expect(selectCanonicalReturns([duplicate, first])).toEqual([first]);
  });

  it('breaks an exact-instant tie in favour of the claim carrying the lost-report link', () => {
    const unlinked = claim({ _id: 'a', handover: { handedOverAt: at(2) } });
    const linked = claim({
      _id: 'b',
      linkedLostItemId: 'lost-1',
      handover: { handedOverAt: at(2) },
    });
    expect(selectCanonicalReturns([unlinked, linked])).toEqual([linked]);
  });

  it('breaks a remaining tie by id so the winner never flickers', () => {
    const first = claim({ _id: 'a', handover: { handedOverAt: at(2) } });
    const second = claim({ _id: 'b', handover: { handedOverAt: at(2) } });
    expect(selectCanonicalReturns([second, first])).toEqual([first]);
    expect(selectCanonicalReturns([first, second])).toEqual([first]);
  });

  it('keeps distinct items with distinct links untouched', () => {
    const one = claim({ _id: 'a', itemId: 'found-1', linkedLostItemId: 'lost-1' });
    const two = claim({ _id: 'b', itemId: 'found-2', linkedLostItemId: 'lost-2' });
    expect(selectCanonicalReturns([one, two])).toHaveLength(2);
  });
});

describe('summarizeRecovery (spec 011)', () => {
  const lostCreated = new Map<string, Date>([
    ['lost-1', T0],
    ['lost-2', T0],
  ]);

  it('computes the linked rate, averages and median over the linked sample only', () => {
    const canonical = [
      claim({
        _id: 'a',
        itemId: 'found-1',
        linkedLostItemId: 'lost-1',
        handover: { handedOverAt: at(6) },
        createdAt: at(5),
      }),
      claim({
        _id: 'b',
        itemId: 'found-2',
        linkedLostItemId: 'lost-2',
        handover: { handedOverAt: at(10) },
        createdAt: at(9),
      }),
      // Unlinked walk-in return: counts as a return and as processing
      // time, but never enters the recovery rate or duration sample.
      claim({
        _id: 'c',
        itemId: 'found-3',
        handover: { handedOverAt: at(3) },
        createdAt: at(1),
      }),
    ];
    const stats = summarizeRecovery(canonical, lostCreated, 3);
    expect(stats.returnedCount).toBe(3);
    expect(stats.linkedReturnedCount).toBe(2);
    expect(stats.returnRate).toBe(0.6667);
    expect(stats.averageDaysToReturn).toBe(8);
    expect(stats.medianDaysToReturn).toBe(8);
    expect(stats.recoverySampleSize).toBe(2);
    // Processing: 1, 1 and 2 days from claim filing to handover.
    expect(stats.averageDaysClaimToHandover).toBe(1.3);
    expect(stats.claimSampleSize).toBe(3);
    expect(stats.excludedNegativeDurations).toBe(0);
  });

  it('returns a null rate — not zero — when there are no lost reports', () => {
    const stats = summarizeRecovery([claim({})], new Map(), 0);
    expect(stats.returnRate).toBeNull();
    expect(stats.returnedCount).toBe(1);
  });

  it('never lets unlinked returns push the rate above 1', () => {
    const canonical = [
      claim({ _id: 'a', itemId: 'found-1', linkedLostItemId: 'lost-1', handover: { handedOverAt: at(2) } }),
      claim({ _id: 'b', itemId: 'found-2', handover: { handedOverAt: at(2) } }),
      claim({ _id: 'c', itemId: 'found-3', handover: { handedOverAt: at(2) } }),
    ];
    const stats = summarizeRecovery(canonical, lostCreated, 1);
    expect(stats.returnRate).toBe(1);
    expect(stats.returnedCount).toBe(3);
  });

  it('excludes retroactive-link negative durations from the averages and counts them', () => {
    const canonical = [
      claim({
        _id: 'a',
        itemId: 'found-1',
        linkedLostItemId: 'lost-1',
        // Handover BEFORE the lost report was filed (retroactive link).
        handover: { handedOverAt: new Date(T0.getTime() - DAY) },
        createdAt: new Date(T0.getTime() - 3 * DAY),
      }),
    ];
    const stats = summarizeRecovery(canonical, lostCreated, 1);
    expect(stats.linkedReturnedCount).toBe(1);
    expect(stats.returnRate).toBe(1);
    expect(stats.recoverySampleSize).toBe(0);
    expect(stats.averageDaysToReturn).toBe(0);
    expect(stats.excludedNegativeDurations).toBe(1);
    // The processing duration (filed 3d before the lost report, handed
    // over 1d before it → 2 days of processing) is real.
    expect(stats.averageDaysClaimToHandover).toBe(2);
    expect(stats.claimSampleSize).toBe(1);
  });

  it('treats a link to a missing or non-lost item as unlinked', () => {
    const canonical = [
      claim({ _id: 'a', itemId: 'found-1', linkedLostItemId: 'lost-gone', handover: { handedOverAt: at(2) } }),
    ];
    const stats = summarizeRecovery(canonical, lostCreated, 2);
    expect(stats.linkedReturnedCount).toBe(0);
    expect(stats.returnRate).toBe(0);
    expect(stats.recoverySampleSize).toBe(0);
  });

  it('computes an odd-count median from the middle duration', () => {
    const lost = new Map<string, Date>([
      ['lost-1', T0],
      ['lost-2', T0],
      ['lost-3', T0],
    ]);
    const canonical = [4, 6, 10].map((days, index) =>
      claim({
        _id: `c${index}`,
        itemId: `found-${index}`,
        linkedLostItemId: `lost-${index + 1}`,
        handover: { handedOverAt: at(days) },
        createdAt: at(days - 1),
      }),
    );
    const stats = summarizeRecovery(canonical, lost, 3);
    expect(stats.medianDaysToReturn).toBe(6);
    expect(stats.averageDaysToReturn).toBe(6.7);
  });
});
