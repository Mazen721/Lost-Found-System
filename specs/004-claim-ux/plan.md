# Plan: Claim UX (004)

## Diagnosis (verified in code)
- `ItemDetailPage.tsx`: `canClaim = role === 'STUDENT' && FOUND && status ∈
  {OPEN, MATCH_CONFIRMED, CLAIM_UNDER_REVIEW}` — no EMPLOYEE, no reporter
  exclusion. Server `claim.routes.ts` POST allows STUDENT + EMPLOYEE.
- Reporter identity on the detail payload: `item.reporter.id` is populated
  by `getItem` exactly for reporter/manager/admin viewers, so
  `item.reporter?.id !== user.id` reliably excludes the reporter and is a
  no-op for everyone else.
- Active-claim check: `claimsApi.list({ itemId })` — server scopes the
  list to the caller for non-managers (`filter.claimantId = actor.id`), so
  any returned claim on this item is the viewer's own. Active statuses:
  PENDING_REVIEW, UNDER_VERIFICATION, APPROVED (claim still in flight);
  REJECTED / COMPLETED are terminal and must not suppress the CTA.
- `ItemGallery` does not overlay badges — overlay variant is ItemCard-only.
- `ItemCard.tsx` renders `ReportTypeBadge` (start) + `StatusBadge` (end)
  over the photo with pastel classes — contrast failure on photos.

## Changes
1. `client/src/features/lost-found/items/claimEligibility.ts` (new):
   `canClaimItem(user, item)` + `findActiveClaim(claims)` over minimal
   structural types (Role / ReportType / ItemStatus / ClaimStatus), so the
   matrix is unit-testable without full API fixtures.
2. `client/tests/claimEligibility.test.ts` (new): data-driven matrix —
   roles × own/other reporter × claimable/terminal statuses × LOST/FOUND,
   plus active-claim detection (active vs terminal vs empty).
3. `client/src/i18n/locales/ar.ts`: `lostFound.claimCtaTitle`,
   `claimCtaDescription`, `claimActiveTitle`, `claimActiveDescription`,
   `claimApprovedTitle`, `claimApprovedDescription`, `claimViewMine`
   (button reuses existing `lostFound.submitClaim`).
4. `ItemDetailPage.tsx`: use `canClaimItem`; add a claims query enabled
   only for STUDENT/EMPLOYEE viewers of FOUND items; render the CTA card
   (or active-claim info card) under PageHeader; header button hidden when
   an active claim exists.
5. `StatusBadge.tsx` / `ReportTypeBadge.tsx`: optional
   `variant: 'default' | 'overlay'` prop. Overlay = `border-white/25
   bg-[#04153E]/90 text-white shadow-lg backdrop-blur-sm ring-1
   ring-white/25`; StatusBadge keeps its dot with a lightened overlay dot
   color per style (navy-style dot would vanish on navy).
6. `ItemCard.tsx`: pass `variant="overlay"` to both badges.

## Verification
- Client: typecheck, vitest (existing 22 + new matrix), production build.
- Server: full suite unchanged (167/167, TMPDIR=~/workspace/.tmp-mongo).
- Live browser pass (seeded app, demo logins): EMPLOYEE sees the big CTA
  on someone else's FOUND item and reaches the claim form; STUDENT too;
  the reporter sees no CTA; a LOST item shows no CTA; Browse screenshot
  shows both overlay badges readable over bright and dark photos.
- clean-code-guard + test-guard over the diff.
