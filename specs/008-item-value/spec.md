# Feature Spec: Automatic Item-Value Estimation + Staff Impact Stats (008)

## Background
The user wants impact numbers for the Lost & Found office: «students lost
items worth X EGP this month; we returned items worth Y». Reporters must
never be asked for a price (he rejected manual capture), so the value is
**estimated automatically** from fields already collected, and staff may
adjust it. Direction confirmed by the user on 2026-11-17:
«تقدير تلقائي + تعديل اختياري».

## Non-negotiable privacy rule
An item's value must **never** be visible to students/employees or on any
public surface. The value fields must be **absent** from student/employee
API payloads (item list, item detail — including when the student is the
item's own reporter — and every embedded item payload in claims/matches/
dashboard responses), not merely hidden in the UI. Value data exists only
for `LOST_FOUND_MANAGER` and `SUPER_ADMIN`: staff item views, the staff
adjustment action, and staff dashboard aggregates.

## Requirements

### 1. Deterministic price-book estimator (server, pure)
`estimateItemValue({ category, brand, title, description })` → EGP value
plus the rule that fired. **Every price lives in one config module —
`server/src/modules/lost-found/items/item-value.price-book.ts` — the
single source of truth; the estimator module holds only detection
logic.** Design:
- Per-category base bands (budget / mid / premium) in EGP, realistic for
  Egypt 2026.
- Brand tiers (premium / mid / budget) detected from the brand field and
  from title/description keywords, in Latin and Arabic spellings
  (سامسونج، شاومي، أوبو، ريلمي، هواوي، آيفون…), reusing the matching
  engine's Arabic normalization / canonical brand utilities where sensible.
- Cheap, reliable model signals (iPhone 11–17, Galaxy S / A series) may
  override the band for phones.
- Unknown brand → category mid default. Result clamped to
  [20, 150_000] EGP and rounded to the nearest 10.

### 2. Item model + creation + seed
- `LostFoundItem` gains: `estimatedValueEGP` (Number),
  `valueSource` (`'AUTO' | 'ADJUSTED'`), `valueAdjustedBy` (ObjectId ref
  User, nullable), `valueAdjustedAt` (Date, nullable).
- Item creation in the report flow computes the AUTO estimate from the
  submitted fields (including the Arabic variants when present).
- The seed computes estimates for **all** seeded items with the same
  function (story + historical blocks). **Seed data changes in this spec**
  — the user must re-run `npm run seed` after merging.

### 3. Serializers / API privacy
- Item list + detail: value fields included **only** for
  `LOST_FOUND_MANAGER` / `SUPER_ADMIN`. The reporter's own privileged view
  (private ID details, reporter block) does **not** imply value access.
- Embedded items: claims serialize value fields for staff only (the claim
  item and the linked lost item); matches are a staff-only module and
  carry value fields for their embedded items; dashboard item cards and
  student dashboard payloads never carry value fields.
- Adjustment endpoint `PATCH /api/v1/lost-found/items/:id/value`,
  staff-only: body `{ valueEGP }` must be a finite number within the
  estimator bounds → otherwise 400; students/employees → 403;
  unauthenticated → 401. On success: sets the value,
  `valueSource='ADJUSTED'`, audit fields, and writes an activity-log entry
  (`ITEM_VALUE_ADJUSTED`) following the existing pattern. Activity logs
  are a SUPER_ADMIN-only surface, so recording the value there is safe.

### 4. Staff dashboard aggregates
`GET /dashboard` payloads for SUPER_ADMIN and LOST_FOUND_MANAGER gain a
`valueStats` block (student/employee payload shape unchanged):
- `lostValueThisMonthEGP` — sum of the current estimates of LOST items
  created in the current calendar month.
- `returnedValueThisMonthEGP` — sum of the current estimates of the items
  whose handover completed in the current calendar month (completed
  claims, bucketed by `handover.handedOverAt`, falling back to the claim
  `updatedAt` for legacy claims — the spec-005 semantic; the claimed
  item's value is counted once, never both pair members).
- `totalLostValueEGP`, `totalReturnedValueEGP` — all-time counterparts.
- «Current estimate» means the adjusted value when `valueSource` is
  ADJUSTED; items with no stored estimate count as 0.

### 5. Client
- Staff item detail: an «القيمة التقديرية» card showing ~X ج.م (Arabic
  locale formatting), a «تعديل» action opening an editor dialog that
  calls the adjustment endpoint, and a subtle «معدّلة يدوياً» marker when
  `valueSource='ADJUSTED'`. Follows existing dialog/form patterns.
- Registry (staff reports table): a compact value column.
- Admin + Manager dashboards: KPI cards «قيمة المفقودات هذا الشهر» and
  «قيمة المسترجعات هذا الشهر» with «تقديرية» wording and all-time
  totals as hints, placed coherently with the existing KPI rows.
- Student/Employee UI: nothing value-related anywhere.
- All strings via `client/src/i18n/locales/ar.ts`.

## Where the prices come from (provenance & refresh)
- The reference is a **curated price table**, hand-picked for this
  system — **not live marketplace data, deliberately**: a stored
  estimate must be stable and the impact stats reproducible, while live
  prices are volatile and unverifiable. (User asked about this on
  2026-11-17; this section is the baked-in answer.)
- Each figure is a typical **used-market mid-range value in EGP** —
  students lose used items, so new-retail prices would systematically
  overstate the numbers. Bands are deliberately wide so normal market
  drift moves a price *inside* its band instead of making the estimate
  look wrong; the stored number is the band's representative value and
  every user-facing surface labels it «تقديرية».
- Figures are current as of **November 2026** and are reviewed
  periodically (e.g. once a semester). **Refresh path = edit the one
  price-book module** (`item-value.price-book.ts`, whose header comment
  carries the same provenance note); estimator logic does not change.
- **Outliers are covered by the per-item staff adjustment**
  (Requirement 3), not by chasing exact prices in the table.

## Semantics notes (from the Goldfish review)
- The lost/returned figures are **live, revisable** numbers — current
  estimates bucketed by historical dates — not month-end snapshots. An
  adjustment today changes a past month's total.
- The lost and found reports of one physical item are estimated
  independently and can differ; **no "% recovered" ratio** is derived
  anywhere in the UI.
- Month boundaries are server-local; deployment assumes Africa/Cairo.
- Editing an item's category/brand/title/description recomputes its
  estimate **only** while `valueSource='AUTO'`; an ADJUSTED value is
  never overwritten by the estimator.

## Out of scope
- Live market pricing / AI pricing (rejected by design: fragile, volatile).
- Showing values to reporters "for their own items" (privacy rule above).
- Backfilling estimates for pre-existing production databases (the seed
  covers the demo dataset; API-created items always get an AUTO estimate).
