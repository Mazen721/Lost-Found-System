import type { Role } from '@/types/auth';
import type { ClaimStatus } from '@/types/claims';
import type { ItemStatus, ReportType } from '@/types/lostFound';

/**
 * Claim eligibility — the single source of truth for "can this viewer
 * claim this item?". Mirrors the server rules for POST /lost-found/claims
 * (STUDENT + EMPLOYEE parity) plus the product rules that a claim only
 * makes sense on a FOUND report that is still claimable, and never on
 * your own report. Kept structural (no full API fixtures) so the whole
 * matrix is unit-testable.
 */

export interface ClaimEligibilityUser {
  id: string;
  role: Role;
}

export interface ClaimEligibilityItem {
  reportType: ReportType;
  status: ItemStatus;
  /** Populated by the detail endpoint for the reporter and staff only. */
  reporter?: { id: string } | null;
}

const CLAIMANT_ROLES: readonly Role[] = ['STUDENT', 'EMPLOYEE'];

const CLAIMABLE_ITEM_STATUSES: readonly ItemStatus[] = [
  'OPEN',
  'MATCH_CONFIRMED',
  'CLAIM_UNDER_REVIEW',
];

export function canClaimItem(
  user: ClaimEligibilityUser | null | undefined,
  item: ClaimEligibilityItem,
): boolean {
  if (!user || !CLAIMANT_ROLES.includes(user.role)) {
    return false;
  }

  if (item.reportType !== 'FOUND' || !CLAIMABLE_ITEM_STATUSES.includes(item.status)) {
    return false;
  }

  return item.reporter?.id !== user.id;
}

/** Claim statuses that mean "my claim on this item is still in flight". */
export const ACTIVE_CLAIM_STATUSES: readonly ClaimStatus[] = [
  'PENDING_REVIEW',
  'UNDER_VERIFICATION',
  'APPROVED',
];

export interface ActiveClaimCandidate {
  status: ClaimStatus;
}

/**
 * Finds the viewer's in-flight claim among claims already scoped to them
 * by the server (the claims list returns only the caller's own claims to
 * non-managers). Terminal claims (REJECTED, COMPLETED) do not count — a
 * rejected claim must not hide the chance to claim again.
 */
export function findActiveClaim<T extends ActiveClaimCandidate>(
  claims: readonly T[],
): T | undefined {
  return claims.find((claim) => ACTIVE_CLAIM_STATUSES.includes(claim.status));
}
