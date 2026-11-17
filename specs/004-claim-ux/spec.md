# Feature Spec: Claim UX — Eligibility Parity, Prominent CTA, Readable Photo Badges (004)

## Problem
A student testing the live site reported two connected defects:

1. "I found my lost iPhone in Browse, clicked it, and there is NO way to say
   it's mine or submit a claim." Root causes:
   - `ItemDetailPage`'s `canClaim` requires role `STUDENT` only, while the
     server (`POST /lost-found/claims`) allows STUDENT + EMPLOYEE — so
     employees never see any claim affordance, breaking the locked
     Student/Employee parity rule (spec 001/003).
   - The check also fails to exclude the item's own reporter.
   - Even for students, the only affordance is one small header button —
     undiscoverable at the exact moment of recognition ("that's mine!").
   The claim flow itself (form → manager review → handover) exists and works;
   only its entry point is broken/hidden.
2. On Browse cards, the report-type and status badges render directly over
   the item photo in their normal pastel styles — the status text (e.g.
   «مفتوح») is unreadable against many photos.

## Requirements
- A single testable client helper decides claim eligibility:
  role ∈ {STUDENT, EMPLOYEE} AND reportType = FOUND AND status ∈
  {OPEN, MATCH_CONFIRMED, CLAIM_UNDER_REVIEW} AND the viewer is not the
  item's reporter. ItemDetailPage uses it for every claim affordance.
- ItemDetailPage gains a prominent claim card directly under the page
  header (before the gallery): navy-tinted surface, heading
  «ده الغرض بتاعك؟», one line explaining the manager verifies ownership
  via the private details, and a large primary «تقديم طلب استلام» button
  to the existing claim route. The small header button stays.
- If the viewer already has an active claim (PENDING_REVIEW /
  UNDER_VERIFICATION / APPROVED) on the item, the card instead shows an
  info state linking to My Claims. The claims list endpoint is already
  claimant-scoped for non-managers, so this costs one small query.
- Photo-overlay badges get a photo-safe `overlay` variant on StatusBadge
  and ReportTypeBadge: solid dark navy, white text, backdrop blur, shadow,
  white ring, status dot kept (lightened so it stays visible on navy).
  Applied only where badges sit on photos (ItemCard). Tables, detail
  headers, and every other surface keep the current pastel style.
- All new copy goes through i18n (`ar.ts` only — the app is Arabic-only).
- No server changes, no route changes, no permission changes: the server
  already implements the correct rules; this spec fixes the client to
  match them.

## Out of scope
- Claim form / review / handover flow changes.
- Badge restyle anywhere except photo overlays.
