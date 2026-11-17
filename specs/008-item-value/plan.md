# Plan: Automatic Item-Value Estimation + Staff Impact Stats (008)

## Diagnosis (verified in code)
- Items: `server/src/modules/lost-found/items/` — model
  `lostFoundItem.model.ts`, service `item.service.ts`, public projection
  `item.projection.ts` (`toPublicItem` builds the public surface field by
  field, so anything not copied there cannot leak).
- `serializeItem(item, includePrivate)` in `item.service.ts` adds private
  ID details + reporter block when `includePrivate`. `getItem` sets
  `includePrivate` for the **reporter** (a student!) as well as staff —
  value inclusion must be a **separate** flag, staff-only.
- `listItems` currently maps every document through `toPublicItem`
  regardless of role; it must serialize with value fields for staff.
- Embedded items: `claim.service.ts` `serializeClaimItem(item,
  includePrivate)` (manager flag already exists; populate select is
  `PUBLIC_ITEM_SELECT`, extended for managers with
  `+privateIdentificationDetails`); `match.service.ts` is staff-only at
  the router level (`authorizeRoles('LOST_FOUND_MANAGER','SUPER_ADMIN')`)
  and serializes embedded items via `toPublicItem` from an explicit
  select list. Dashboard `getBoardExtras` / student dashboard populate
  items with explicit field selects that never include value fields.
- Arabic text intelligence lives in
  `modules/lost-found/matches/matching-text.ts`: `normalizeText`,
  `canonicalTokens`, `canonicalBrandGroup` (maps iPhone→apple,
  Galaxy→samsung, Arabic transliterations سوني/سامسونج/شاومي/هواوي… to
  canonical groups). It does **not** know oppo/realme/vivo/infinix/honor —
  the estimator keeps a small supplementary alias table of its own rather
  than touching the matching engine.
- Activity logs: `logActivity()` shared service; entries carry
  `descriptionKey` + `params` rendered from `ar.ts` `activity.*`
  templates; the logs API is SUPER_ADMIN-only.
- Dashboard: `dashboard.service.ts` `getDashboard` returns role-shaped
  payloads; spec 005 already established the returned semantic (completed
  claims by `handover.handedOverAt`, fallback `updatedAt`, tallied in JS
  with date-fns boundaries).
- Seed: `server/src/seed/demoData.ts` builds item docs in three places —
  story `itemDocs` (~line 885), historical pairs and historical singles
  inside `historicalItemDocs` (~lines 1225–1355). All three must compute
  estimates via the same estimator.

## Goldfish review — findings & dispositions (BINDING amendments)
Two zero-context reviewers attacked this plan (privacy/leak paths;
estimator sanity + stats semantics). The amendments below override any
conflicting text elsewhere in this plan.

**Privacy review:**
- P1 (major, accepted): `claim.service.ts` has ONE shared
  `PUBLIC_ITEM_SELECT`. Do NOT add value fields to it. Add a separate
  `MANAGER_ITEM_SELECT = PUBLIC_ITEM_SELECT + ' +estimatedValueEGP
  +valueSource +valueAdjustedBy +valueAdjustedAt'` used only when
  `includeManagerFields`; pass the manager flag to the
  `linkedLostItemId` populates in `loadClaimById` AND `listClaims`;
  route `linkedLostItem` through `serializeClaimItem` (today it uses
  plain `toPublicItem`); value fields must NOT be gated on
  `privateIdentificationDetails` presence (the existing early return).
- P2 (major, accepted): mutation responses are first-class privacy
  surfaces. Integration tests must assert field absence in the POST
  item 201 body (student creator), the PATCH item 200 body (student
  reporter) and the POST claim 201 body — not only list/detail.
  `updateItem` gains the re-estimation rule in E5 below.
- P3 (major, accepted): the adjustment activity-log `description` must
  be value-free (`Adjusted estimated value for item LF-…`); the value
  lives only in `params`/`metadata` of a SUPER_ADMIN-only surface.
  `getLostFoundInsightStats` must NOT include `valueStats` or any
  per-item value; add a test asserting the insights response JSON
  contains neither `estimatedValueEGP` nor `valueStats`.
- P4 (major, accepted): defense in depth — the four value fields are
  `select: false` on the model (same pattern as
  `privateIdentificationDetails`), with explicit `+field` opt-ins at:
  item `loadItem` (staff), staff `listItems`, `updateItem` /
  `adjustItemValue` document loads, claim `MANAGER_ITEM_SELECT`,
  match item select, and the `getValueStats` queries. Extend
  `tests/unit/projection.test.ts` with a value-carrying fixture.
- P5 (minor, accepted): `itemValueFields` returns exactly four keys —
  `estimatedValueEGP: number | null`, `valueSource: 'AUTO'|'ADJUSTED'|
  null`, `valueAdjustedBy: string | null` (user id),
  `valueAdjustedAt: Date | null` — nulls when no estimate is stored.
  Same four keys in the client type.
- P6 (minor, accepted): matches get a named `MatchItem extends
  PublicItem` type (with the value fields) instead of widening
  `toPublicItem`; a code comment notes the staff-only router gate.
- P7 (minor, accepted): the registry value column is gated on the
  viewer's staff role (not on a first-row payload heuristic).

**Estimator / stats review:**
- E1 (critical, accepted): model override fires ONLY when
  `category === 'Phones'` — a «جراب آيفون 13» (Accessories) or an
  iPhone charging cable (Electronics) must never be priced as a phone.
- E2 (critical, accepted): low-value accessory sub-bands are checked
  BEFORE the category band, regardless of category (the seed's own
  Lenovo charger is filed under Laptops): charger/cable/شاحن/كابل →
  800 cap; usb/flash/فلاشة → 500; case/cover/جراب/حافظة → 600;
  power bank/باور بانك → 1,200. Rule name: `'accessory-cap'`.
  High-side Electronics sub-bands: tablet/تابلت/آيباد/ipad → 15,000;
  smartwatch/ساعة ذكية → 6,000 (rule `'subcategory'`).
- E3 (major, accepted): Samsung phones with NO S-model signal default
  to 12,000 (Galaxy A midpoint), not the 45,000 premium band. The
  premium phone band is reached via Apple or an explicit S/Ultra
  signal only.
- E4 (major, accepted): no-brand Phones default to 9,000 (budget-leaning)
  instead of the 15,000 mid band; other categories keep the mid
  default. Recorded bias: no-brand Laptops still default to mid.
- E5 (major, accepted; = P2's rule): in `updateItem`, when
  `valueSource === 'AUTO'` and any of category/brand/title/description
  changed, recompute the estimate. NEVER recompute an ADJUSTED value.
  One integration test per branch.
- E6 (major, accepted): model detection runs regexes over the
  `normalizeText(...)` string (digits already unified): iPhone
  `/(?:iphone|ايفون)\s*-?\s*(\d{1,2})/` (covers «آيفون13» and
  «آيفون ١٣»); Galaxy `/(?:galaxy|جالاكسي|جلاكسي)\s*-?\s*([sa])\s*-?\s*(\d{1,2})/`
  (covers `A 15`, `A15`). The number must attach to the brand token —
  no "bare identifier" inference. Negative test: "Lab 204" in a phone
  description must not invent a model.
- E7 (major, accepted): brand detection precedence is brand field →
  title → description, first hit per stage, and the estimator's
  supplementary alias table is applied to the brand string FIRST
  (before `canonicalBrandGroup`). Wording correction: the live report
  flow has NO separate Arabic fields — students type Arabic into the
  same fields; only the seed concatenates `*Ar` variants.
- E8 (major, accepted): lenovo/dell/hp are MID laptop brands; the
  premium laptop band requires a premium line token (xps, spectre,
  elitebook, thinkpad, legion, zenbook, yoga) or Apple. Alias table
  gains macbook→apple, اسوس→asus (mid), ايسر→acer (mid).
- E9 (minor, accepted): returned sums dedupe by claimed `itemId`.
- E10 (minor, accepted): stats tests add — a completed claim whose
  item was created in a previous month (returned-this-month only), a
  linked pair counted exactly once, and a legacy completed claim
  without `handover.handedOverAt` (updatedAt fallback bucket).
- E11 (minor, accepted): adjustment schema uses `.int()` so staff
  values match estimator granularity.
- E12 (documented, no code change): lost/returned KPIs are live,
  revisable figures (current values, historical buckets), NOT
  month-end snapshots; the two sides of a pair can carry different
  estimates, so NO "% recovered" ratio is derived anywhere in the UI.
  Month boundaries are server-local; deployment assumes Africa/Cairo.

## Estimator design (`modules/lost-found/items/item-value.ts`, pure)
**Price data (added 2026-11-17, per the user's provenance question):**
all bands, tiers, aliases, model tables and bounds live in ONE config
module, `items/item-value.price-book.ts` — curated used-market
mid-range EGP values as of November 2026, deliberately NOT live
marketplace data (stability/reproducibility), wide bands so drift stays
inside them, header comment carries the provenance + review cadence.
Refresh = edit that file only; `item-value.ts` holds detection logic.
See spec.md «Where the prices come from».

Input: `{ category, brand?, title, description }` (callers pass the
English fields with Arabic variants concatenated, so Arabic brand
spellings in `brandAr` / titles are seen too).
Output: `{ valueEGP, rule, brandGroup, tier }` where
`rule ∈ 'model' | 'brand-tier' | 'category-default'`.

Category bands (EGP, budget/mid/premium):
| Category    | budget | mid   | premium |
|-------------|--------|-------|---------|
| Phones      | 6,000  | 15,000| 45,000  |
| Laptops     | 15,000 | 30,000| 60,000  |
| Electronics | 500    | 2,000 | 8,000   |
| Headphones  | 400    | 1,500 | 7,000   |
| Wallets     | 200    | 600   | 2,500   |
| Bags        | 400    | 1,200 | 4,000   |
| Keys        | 100    | 200   | 400     |
| Documents   | 50     | 100   | 200     |
| Accessories | 300    | 1,000 | 3,500   |
| Books       | 150    | 400   | 1,200   |
| Clothing    | 300    | 800   | 2,500   |
| Other       | 200    | 500   | 1,500   |

Brand tiers (canonical group → tier):
- premium: apple, sony, bose, beats, northface, nike, adidas,
  microsoft, rayban, dyson (samsung is premium ONLY via an S/Ultra
  model signal — see E3; dell/hp/lenovo are mid unless a premium laptop
  line token appears — see E8)
- mid: samsung (no model signal), xiaomi, huawei, honor, oppo, vivo,
  anker, casio, logitech, jbl, kingston, thermos, dell, hp, lenovo,
  asus, acer
- budget: realme, infinix, tecno, itel
Supplementary aliases (normalized token → group): أوبو/اوبو→oppo,
ريلمي→realme, فيفو→vivo, انفينكس→infinix, هونر/اونر→honor,
تكنو→tecno, بوكو→xiaomi (Poco is a Xiaomi line), ريدمي→xiaomi,
بيتس→beats, بوز→bose, لوجيتك→logitech,
مايكروسوفت→microsoft, ماك بوك/macbook→apple, اسوس→asus, ايسر→acer,
نورث فيس handled by matching-text phrases.

Detection order (after the E2 accessory sub-bands, which run first):
(1) model signal — Phones category only (E1), (2) brand tier,
(3) category default. Brand detection precedence (E7 + m9): the
estimator alias table over the **brand string** first, then
`canonicalBrandGroup(brand)`, then title, then description — first hit
per stage.

Special fallbacks: samsung + Phones + no model signal → 12,000 (E3);
no brand at all + Phones → 9,000 (E4).

Model signals (Phones category ONLY, regexes over the normalized
combined text — E6):
- iPhone: `/(?:iphone|ايفون)\s*-?\s*(\d{1,2})/`, N in 11–17 → table:
  11:15000, 12:22000, 13:28000, 14:34000, 15:42000, 16:50000, 17:58000.
- Galaxy: `/(?:galaxy|جالاكسي|جلاكسي)\s*-?\s*([sa])\s*-?\s*(\d{1,2})/` —
  S N (21–25) → 15000/20000/28000/38000/48000; A two-digit model:
  first digit 1→7000, 2→8500, 3→10000, 4→12000, 5→14000, 7→17000.
Model value then clamped like everything else.

Bounds: `VALUE_MIN_EGP = 20`, `VALUE_MAX_EGP = 150_000`; round to the
nearest 10 EGP. The same constants validate manual adjustments.

## Server changes
1. `items/item-value.price-book.ts` (new): ALL price data + bounds +
   tier/alias/model tables, with the provenance header comment.
   `items/item-value.ts` (new): estimator logic + `ValueSource` type,
   importing the price book.
2. `items/lostFoundItem.model.ts`: add `estimatedValueEGP`,
   `valueSource` (enum AUTO/ADJUSTED, default 'AUTO'), `valueAdjustedBy`
   (ObjectId ref User, default null), `valueAdjustedAt` (Date, default
   null) to interface + schema — all four with `select: false` (P4).
3. `items/item.projection.ts`: extend `ProjectableItem` with the optional
   value fields; add `ItemValueFields` interface +
   `itemValueFields(item)` helper returning the fields (with
   `estimatedValueEGP: null` when unset) — used **only** by staff-gated
   serializers. `toPublicItem` is **not** changed.
4. `items/item.service.ts`:
   - `isStaffRole(role)` helper (LOST_FOUND_MANAGER | SUPER_ADMIN).
   - `serializeItem(item, { includePrivate, includeValue })`.
   - `createItem`: compute estimate from input (+ Ar fields when
     present) and store `estimatedValueEGP` + `valueSource: 'AUTO'`;
     response serialized with `includeValue: isStaffRole(actor.role)`.
   - `listItems`: staff → serialized with value fields; others → public.
   - `getItem`: `includeValue` = staff only (reporter keeps private view
     without value).
   - `adjustItemValue(actor, id, valueEGP)` (new): load item (404 if
     missing), set fields + audit, save, `logActivity` action
     `ITEM_VALUE_ADJUSTED`, descriptionKey `itemValueAdjusted`, params
     `{ code, value }`, metadata `{ previousValueEGP, newValueEGP,
     previousSource }`; return `getItem(actor, id)`.
5. `items/item.validation.ts`: `adjustItemValueSchema`
   `{ valueEGP: z.number().finite().int().min(20).max(150000) }` (E11).
6. `items/item.controller.ts` + `items/item.routes.ts`:
   `PATCH /:id/value` with `authorizeRoles('LOST_FOUND_MANAGER',
   'SUPER_ADMIN')` **before** the generic `PATCH /:id` route, params +
   body validation.
7. `claims/claim.service.ts`: manager populate select gains
   `estimatedValueEGP valueSource valueAdjustedAt`; `serializeClaimItem`
   adds value fields when the manager flag is set — for both the claim
   item and the linked lost item (staff only; students keep the exact
   current payload).
8. `matches/match.service.ts`: `PUBLIC_ITEM_SELECT` gains the value
   fields and `serializeMatch` attaches them via `itemValueFields`
   (router is staff-only; noted explicitly).
9. `dashboard/dashboard.service.ts`: `getValueStats(now)` — JS tallies
   mirroring spec 005: LOST items (`reportType`, `createdAt`,
   `estimatedValueEGP`) for month + all-time sums; completed claims
   (`handover.handedOverAt` ?? `updatedAt`, populate `itemId` →
   `estimatedValueEGP`) for returned sums. Month window =
   `startOfMonth(now)` → `addMonths(start, 1)` (date-fns, server-local).
   `AdminDashboard` and `ManagerDashboard` gain
   `valueStats: { lostValueThisMonthEGP, returnedValueThisMonthEGP,
   totalLostValueEGP, totalReturnedValueEGP }`. Student payload untouched.
10. `seed/demoData.ts`: in all three item-doc builders, compute
    `estimatedValueEGP` + `valueSource: 'AUTO'` via the estimator from
    the spec's category/brand(+Ar)/title(+Ar)/description(+Ar).
11. `client/src/i18n/locales/ar.ts`: `activity.itemValueAdjusted`
    template (server log rendering) — server-side log descriptions are
    rendered client-side from these keys.

## Client changes
1. `types/lostFound.ts`: `LostFoundItem` gains optional
   `estimatedValueEGP?: number | null`, `valueSource?: 'AUTO'|'ADJUSTED'`,
   `valueAdjustedAt?: string | null`.
2. `types/dashboard.ts`: `AdminDashboard` + `ManagerDashboard` gain
   `valueStats` (four number fields).
3. `itemsApi.adjustValue(id, valueEGP)` → `PATCH /lost-found/items/:id/value`.
4. New `ItemValueCard.tsx` (staff-only render in `ItemDetailPage` sidebar
   column, next to the private-details card): shows «القيمة التقديرية»
   ~X ج.م via `formatNumber`, «معدّلة يدوياً» badge when ADJUSTED, and a
   «تعديل» button opening a `Dialog` (ui/dialog) with a number input
   (min 20, max 150000), save → mutation → invalidate item query → toast.
   Rendered only when `user.role` is staff **and** the payload carries
   the field.
5. `ReportsTable.tsx`: compact «القيمة التقديرية» column rendered only
   when the first row carries the field (staff payloads) — value +
   «معدّلة» marker.
6. Dashboards: a shared `ValueStatsCards.tsx` rendering two
   `PortalSummaryMetric`-style cards (lost this month — gold, returned
   this month — emerald; hints show all-time totals + «قيمة تقديرية»)
   inserted into `ManagerDashboard` under the summary grid and into
   `AdminDashboard` under `AdminSummaryGrid`.
7. `ar.ts`: `lostFound.estimatedValue`, `lostFound.estimatedValueHint`,
   `lostFound.adjustValue`, `lostFound.adjustValueTitle`,
   `lostFound.adjustValueLabel`, `lostFound.adjustValueSave`,
   `lostFound.valueAdjustedManually`, `lostFound.valueSaved`,
   `dashboard.lostValueThisMonth`, `dashboard.returnedValueThisMonth`,
   `dashboard.valueAllTimeHint`, `common.currencyEGP` («ج.م») as needed.

## Tests
- Unit `server/tests/unit/item-value.test.ts`: estimator battery —
  premium/mid/budget brands in Latin + Arabic spellings (incl. أوبو,
  ريلمي from the supplementary table), brand found only in title /
  description, iPhone + Galaxy model overrides, unknown brand → mid
  default, no brand → mid default, clamping at both bounds, rounding,
  rule reporting.
- Integration `server/tests/integration/item-value.test.ts` (seeded,
  supertest, same harness as public-items.test.ts):
  - Privacy: student + employee item list and detail payloads contain
    none of `estimatedValueEGP`/`valueSource`/`valueAdjustedBy`/
    `valueAdjustedAt` — including the student's **own** reported item
    detail; student claims list/detail embedded items likewise;
    student dashboard payload has no `valueStats`.
  - Staff: manager + admin list/detail carry the fields; created item
    (by a student) has an AUTO estimate visible to staff.
  - Adjustment: manager adjusts → 200, value + ADJUSTED + audit fields
    set, activity log row exists; admin adjusts → 200; student → 403;
    employee → 403; unauthenticated → 401; out-of-bounds / NaN /
    missing → 400.
  - Stats: seeded dashboard `valueStats` for manager + admin equal the
    sums computed independently from the DB (same helper math in the
    test via direct model queries), incl. a hand-built month-boundary
    case (item created last month excluded from this-month, included in
    all-time) and an adjusted value being the one summed.
- Client: existing suite must stay green; add a small unit test only if
  a pure helper is introduced (currency formatting reuses
  `formatNumber`, so likely none needed).

## Verification
- Root typecheck 0; full server suite green (179 existing + new);
  client suite green; client production build passes.
- Live browser pass (seeded app): manager item detail shows the value
  and performs a real adjustment (value + marker update); admin and
  manager dashboards show both value cards with numbers equal to an API
  check; student browse + item detail DOM contains no value text/field;
  0 console/page errors. Screenshots `test-artifacts/design008-*.png`.
- Guards: clean-code-guard + test-guard over the diff.
- Bundle regenerated with HEAD + branch refs and clone-verified.
  **Seed changed** — report must flag `npm run seed` for the user.
