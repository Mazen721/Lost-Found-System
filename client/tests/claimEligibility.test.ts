import { describe, expect, it } from 'vitest';
import {
  canClaimItem,
  findActiveClaim,
  type ClaimEligibilityItem,
  type ClaimEligibilityUser,
} from '../src/features/lost-found/items/claimEligibility';
import type { Role } from '../src/types/auth';
import type { ClaimStatus } from '../src/types/claims';
import type { ItemStatus } from '../src/types/lostFound';

const CLAIMABLE_STATUSES: ItemStatus[] = ['OPEN', 'MATCH_CONFIRMED', 'CLAIM_UNDER_REVIEW'];
const TERMINAL_STATUSES: ItemStatus[] = ['APPROVED_FOR_HANDOVER', 'RETURNED', 'CLOSED'];
const CLAIMANT_ROLES: Role[] = ['STUDENT', 'EMPLOYEE'];
const STAFF_ROLES: Role[] = ['LOST_FOUND_MANAGER', 'SUPER_ADMIN'];

function user(role: Role, id = 'viewer-1'): ClaimEligibilityUser {
  return { id, role };
}

function foundItem(overrides: Partial<ClaimEligibilityItem> = {}): ClaimEligibilityItem {
  return {
    reportType: 'FOUND',
    status: 'OPEN',
    reporter: { id: 'someone-else' },
    ...overrides,
  };
}

describe('canClaimItem (spec 004)', () => {
  it.each(CLAIMANT_ROLES.flatMap((role) => CLAIMABLE_STATUSES.map((status) => ({ role, status }))))(
    '$role can claim a FOUND item in status $status reported by someone else',
    ({ role, status }) => {
      expect(canClaimItem(user(role), foundItem({ status }))).toBe(true);
    },
  );

  it.each(CLAIMANT_ROLES)(
    '%s can claim when the reporter is hidden by privacy (reporter is null)',
    (role) => {
      expect(canClaimItem(user(role), foundItem({ reporter: null }))).toBe(true);
    },
  );

  it.each(CLAIMANT_ROLES.flatMap((role) => CLAIMABLE_STATUSES.map((status) => ({ role, status }))))(
    '$role cannot claim their OWN report (status $status)',
    ({ role, status }) => {
      const viewer = user(role);
      expect(canClaimItem(viewer, foundItem({ status, reporter: { id: viewer.id } }))).toBe(false);
    },
  );

  it.each(STAFF_ROLES)('%s never claims — staff review claims instead', (role) => {
    expect(canClaimItem(user(role), foundItem())).toBe(false);
  });

  it('an anonymous viewer cannot claim', () => {
    expect(canClaimItem(null, foundItem())).toBe(false);
    expect(canClaimItem(undefined, foundItem())).toBe(false);
  });

  it.each(CLAIMANT_ROLES)('%s cannot claim a LOST report — claims attach to FOUND items', (role) => {
    expect(canClaimItem(user(role), foundItem({ reportType: 'LOST' }))).toBe(false);
  });

  it.each(CLAIMANT_ROLES.flatMap((role) => TERMINAL_STATUSES.map((status) => ({ role, status }))))(
    '$role cannot claim a FOUND item in terminal status $status',
    ({ role, status }) => {
      expect(canClaimItem(user(role), foundItem({ status }))).toBe(false);
    },
  );
});

describe('findActiveClaim (spec 004)', () => {
  const claim = (status: ClaimStatus) => ({ status });

  it.each(['PENDING_REVIEW', 'UNDER_VERIFICATION', 'APPROVED'] as ClaimStatus[])(
    'a %s claim is still in flight',
    (status) => {
      expect(findActiveClaim([claim(status)])?.status).toBe(status);
    },
  );

  it.each(['REJECTED', 'COMPLETED'] as ClaimStatus[])(
    'a %s claim is terminal and must not suppress a new claim',
    (status) => {
      expect(findActiveClaim([claim(status)])).toBeUndefined();
    },
  );

  it('finds the in-flight claim among terminal ones', () => {
    const claims = [claim('REJECTED'), claim('UNDER_VERIFICATION'), claim('COMPLETED')];
    expect(findActiveClaim(claims)?.status).toBe('UNDER_VERIFICATION');
  });

  it('returns undefined when the viewer has no claims on the item', () => {
    expect(findActiveClaim([])).toBeUndefined();
  });
});
