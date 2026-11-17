# Feature Spec: Staff Analytics Pack (011)

## Background
Specs 008/009 gave Admin + Manager a Statistics page with the activity
chart, the estimated-value cards and distribution breakdowns. The user
then picked four more staff analytics, for **both** `SUPER_ADMIN` and
`LOST_FOUND_MANAGER`: (1) recovery-time statistics, (2) stale-item
alerts, (3) hot locations with a lost/found split, (4) a monthly Excel
report export. This spec pins every definition before implementation;
the figures are operational statistics, so an ambiguous denominator is
a bug, not a detail.

Everything in this spec is **staff-only**, following the 008/009
gating pattern: the new blocks exist only on the Admin and Manager
`GET /dashboard` payloads (the student/employee payload stays
structurally free of them, test-pinned), the export endpoint is
role-guarded, and none of the new data feeds the AI-insights pipeline.

All dashboard blocks in this spec are **all-time and period
independent**, like `valueStats` (008) and `breakdowns` (009): they
ignore the dashboard `period` parameter. The export is the exception —
it is scoped to the current month where stated.

> **Review note.** These definitions were attacked by a fresh
> zero-context reviewer before implementation (19 findings). The
> critical ones changed the definitions below — most importantly the
> return-rate population (§1), the two-population average (§1), and a
> single canonical dedupe shared with spec 008 (§1, §4). The full
> disposition list is in the appendix; where this spec deviates from
> the original feature brief, the appendix says so and why.

## Canonical definitions (shared by §1 and §4)
- A **completed return** is a `ClaimRequest` with status `COMPLETED`.
  Its **handover instant** is `handover.handedOverAt`, falling back to
  the claim's `updatedAt` for legacy completed claims with no handover
  timestamp — the same instant spec 005 buckets and spec 008 values
  by. (Accepted caveat: the fallback instant can move if a legacy
  claim is edited after completion; recorded handovers — the normal
  flow — always carry `handedOverAt`, so this is a legacy-data
  footnote, kept for consistency with 005/008.)
- **Canonical dedupe.** Completed claims are ordered by
  (handover instant ascending, then claims whose `linkedLostItemId`
  resolves to an existing LOST item first, then `_id` ascending) and
  selected in two passes: first one claim per claimed item
  (`itemId`), then — among the survivors — one claim per non-null
  `linkedLostItemId`. The result is the **canonical return set**.
  Rationale: one physical recovery is one return, even when the same
  object was logged as two found reports claimed against one lost
  report. Spec 008's returned-value sums adopt this same winner rule
  (the winner decides which handover instant buckets the item's
  value), so every "returned" figure in the product agrees on which
  claim represents a return; spec 005's activity series remains a
  per-event count by design and is labelled as such.

## Requirements

### 1. Recovery stats — `recoveryStats` (server, staff payloads)
Computed over the canonical return set (all-time):
- `returnedCount`: the size of the canonical return set — distinct
  physical returns.
- `linkedReturnedCount`: the number of distinct LOST items in the
  canonical set whose `linkedLostItemId` resolves to an existing
  `reportType: 'LOST'` item (a link pointing at a non-LOST or missing
  item is treated as unlinked).
- `totalLostReports`: count of `LostFoundItem` with
  `reportType: 'LOST'` (all-time).
- `returnRate = linkedReturnedCount / totalLostReports` — a linked
  recovery rate, bounded in [0, 1] by construction (the numerator is
  a set of distinct lost items). Wire format: fraction rounded to 4
  decimals. When `totalLostReports` is 0 the rate is **`null`**
  (rendered «—» / «غير متاح»), never 0 — 0 means "lost reports exist
  and none was recovered". This supersedes the naive
  returned-items ÷ lost-reports ratio: that ratio can exceed 100%
  (walk-in returns of found items with no lost report) and was the
  exact figure spec 008 refused to publish.
- **Days to return** (the recovery sample): for each canonical claim
  with a resolvable LOST link, `(handover instant − linked LOST
  item's createdAt) / 86 400 000` fractional days — measured from the
  lost *report's filing date* to the handover, and labelled as such.
  Claims whose duration is negative (retroactively linked reports
  filed after the handover) are **excluded** from the average/median
  and counted in `excludedNegativeDurations` — never silently clamped
  into fake "instant returns".
- `averageDaysToReturn` / `medianDaysToReturn`: mean / median (even
  count → mean of the two middle values) of the recovery sample,
  rounded to 1 decimal; 0 when the sample is empty.
  `recoverySampleSize` publishes the sample's n — an average from one
  return must not carry the visual authority of one from two hundred.
  Unlinked claims never enter this sample: their only start would be
  the claim's filing, which measures processing, not recovery.
- **Processing time** (separate metric, never averaged into the
  recovery sample): `averageDaysClaimToHandover` = mean of
  `(handover instant − claim.createdAt) / 86 400 000` over **all**
  canonical claims, negative durations excluded, rounded to 1
  decimal; `claimSampleSize` publishes its n; 0 when empty.
- Payload shape:
  `recoveryStats: { returnedCount, linkedReturnedCount,
  totalLostReports, returnRate, averageDaysToReturn,
  medianDaysToReturn, recoverySampleSize,
  averageDaysClaimToHandover, claimSampleSize,
  excludedNegativeDurations }` on the Admin and Manager payloads
  only.
- Relationship to the items-by-status breakdown (009): that block
  counts item records in status `RETURNED`; `returnedCount` counts
  canonical completed handovers. The handover flow advances the item
  to `RETURNED` in the same operation, so the two agree on data the
  product itself produced; they can diverge only after out-of-band
  data edits. Both stay, under their own labels.

Client: a KPI card row on the Statistics page (PortalSummaryGrid
pattern, like `ValueStatsCards`):
- «إجمالي المسترجعات» (`returnedCount`);
- «نسبة الاسترجاع» (`returnRate` as a 1-decimal percentage, «—» when
  null; hint shows `linkedReturnedCount` of `totalLostReports`);
- «متوسط زمن الاسترجاع» (`averageDaysToReturn`, «—» when
  `recoverySampleSize` is 0; hint carries the median and the sample
  size, worded «من تاريخ بلاغ الفقدان حتى التسليم»);
- «متوسط زمن المعالجة» (`averageDaysClaimToHandover` — from claim
  filing to handover — with its n in the hint).

### 2. Stale items — `staleItems` + `staleCount` (server, staff payloads)
- An item is a stale **candidate** when its status is one of the
  active, awaiting-action statuses — `OPEN`, `MATCH_CONFIRMED`,
  `CLAIM_UNDER_REVIEW`. (`APPROVED_FOR_HANDOVER` is deliberately
  excluded: approved handovers already have their own operational
  surface — the "handovers waiting" list in both dashboards' urgent
  queues. This is a product decision, not an oversight.)
- **Movement**: an item's `lastMovementAt` is the later of its own
  `updatedAt` and the latest `updatedAt` of any claim filed **on**
  it (`ClaimRequest.itemId = item`). An item whose claim is actively
  progressing is moving, even if nobody saved the item record itself.
  Any other recorded touch (a staff edit, a value adjustment) also
  counts as movement — the list means "nobody has touched this case".
- An item is **stale** when `lastMovementAt <= now − 14 days`,
  evaluated against a single `now` captured for the request and one
  snapshot computation for count + list together. An item exactly 14
  days without movement **is** stale. `ageDays` is computed
  server-side from that same `now`:
  `floor((now − lastMovementAt) / 86 400 000)` (whole elapsed days),
  so a listed item always shows `ageDays >= 14`.
- `staleItems`: stalest first (`lastMovementAt` ascending, `_id`
  ascending tiebreak — bulk-created items share timestamps),
  **capped at 20**. `staleCount`: the **full** number of stale items
  (may exceed the cap).
- Entry fields: `id`, `reportNumber`, `reportType`, `itemTitle`,
  `itemTitleAr?`, `category`, `status`, `imageUrl` (first image or
  null), `building`, `buildingAr?`, `ageDays`, `lastMovementAt`,
  `reporterRole` (the reporting user's role).
- Placement decision: the list rides the dashboard payload (like
  `valueStats`/`breakdowns`) rather than a dedicated endpoint — both
  consumers (Statistics page section, dashboard alert) already fetch
  `GET /dashboard`, and the capped list is small.

Client:
- Statistics page: a «أغراض تحتاج متابعة» section listing
  `staleItems` (thumbnail, title, report number, status, building,
  «منذ {{ageDays}} يوم دون حركة»); each row links to the item detail
  (`/lost-found/items/:id`). When `staleCount` is 0 the section shows
  the empty state «لا توجد أغراض نايمة — كل البلاغات حديثة». When
  `staleCount > staleItems.length`, a footer line notes the remainder
  («و {{count}} غرض آخر»).
- Both staff dashboards: a compact alert card rendered **only when
  `staleCount > 0`** — the count plus a link to `/statistics`. Nothing
  renders when the count is zero.

### 3. Hot locations — `locationsTop` lost/found split (server + client)
- Spec 009's `locationsTop` entries gain `lost` and `found` counts
  (group by `locationId` **and** `reportType`); `count` stays
  `lost + found`. Same top-5 selection and the same deterministic
  ordering as 009 (count descending, location id ascending tiebreak).
- Entries also gain `sharePercent`: the location's share of **all**
  reported items, computed **server-side** in the same `getBreakdowns`
  pass (denominator = the total item count from that same call, not a
  sum over another breakdown fetched separately):
  `count / totalItems × 100`, rounded to 1 decimal; 0 when there are
  no items. The top-5 shares are not expected to sum to 100% — the
  card carries a footnote saying the list shows the five busiest
  locations only.
- Client: the Statistics page locations block renders each location
  with its lost/found split, a two-segment split bar, and the share
  percentage.

### 4. Monthly Excel export — `GET /dashboard/report.xlsx`
- Guarded exactly like `/dashboard/activity-series`:
  `authenticate` (401 when unauthenticated) +
  `authorizeRoles('SUPER_ADMIN', 'LOST_FOUND_MANAGER')` (403 for
  STUDENT/EMPLOYEE).
- The report covers the **current server-local month**. Every instant
  filter in the workbook (item creation, handover bucketing, value
  bucketing) uses the **same half-open interval**
  `[startOfMonth(now), startOfMonth(now) + 1 month)`: an instant
  exactly at the month start is included; exactly at the next month
  start is excluded. (The dashboard's day semantics are server-local
  throughout the product — spec 005 — and the summary sheet stamps
  the generation time so the boundary is auditable.)
- Generated server-side with the `exceljs` package (new server
  dependency), returned as an attachment:
  `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
  filename `تقرير-المفقودات-<yyyy-MM>.xlsx` via an RFC 5987
  `filename*` Content-Disposition. The server's CORS config exposes
  `Content-Disposition` (`exposedHeaders` in `server/src/app.ts`) —
  found during the live pass: without it, a cross-origin `fetch`
  cannot read the header and the client would fall back to a generic
  filename.
- Sheets (Arabic names, in this order). Every sheet opens with a
  title/note row stating its basis, so the mixed scoping inside one
  workbook is disclosed where it is read, not buried:
  1. **«ملخص الشهر»** — basis: «البلاغات حسب تاريخ الإبلاغ،
     والاسترجاعات حسب تاريخ التسليم». Label/value rows: month label
     (Arabic long month + year, e.g. «نوفمبر 2026»); «تاريخ إنشاء
     التقرير» (full generation timestamp); «بلاغات مفقودة هذا
     الشهر» (LOST items created in the month); «بلاغات معثور عليها
     هذا الشهر» (FOUND items created in the month); «عمليات استرجاع
     هذا الشهر» (canonical return set members whose handover instant
     falls in the month — the same canonical dedupe as §1, so this
     count and the returned value below always describe the same
     returns); «قيمة المفقودات هذا الشهر (ج.م) — تقديرية» and
     «قيمة المسترجعات هذا الشهر (ج.م) — تقديرية» (the `valueStats`
     this-month figures). Then a separate, clearly headed section
     «مؤشرات تراكمية — ليست خاصة بهذا الشهر»: «نسبة الاسترجاع
     الإجمالية» and «متوسط زمن الاسترجاع الإجمالي (يوم)» — the
     all-time `recoveryStats` figures, kept out of the monthly rows
     so nobody reads them as this month's performance.
  2. **«حسب الفئة»** — basis: «حسب تاريخ الإبلاغ». Every category in
     `LOST_FOUND_CATEGORIES` (zero-filled): category label, «مفقود»,
     «معثور عليه», «الإجمالي» — items **created in the month**.
  3. **«حسب المكان»** — basis: «حسب تاريخ الإبلاغ». Top 10 locations
     by items **created in the month**: location name, «مفقود»,
     «معثور عليه», «الإجمالي»; count-descending, location-id
     tiebreak.
  4. **«أغراض نايمة»** — basis: «قائمة لحظية بتاريخ إنشاء التقرير».
     The §2 stale list **uncapped**: report number, title, «النوع»
     (مفقود/معثور عليه), category, status, location name, «دور
     المُبلِّغ», «أيام دون حركة» (`ageDays`), «آخر حركة»
     (`lastMovementAt`).
- Client: a «تصدير تقرير الشهر» button in the Statistics page header
  actions. It downloads through an authenticated fetch (the token
  lives in local storage; a plain anchor cannot send it) → blob →
  object URL → anchor `download` click, using the server-provided
  filename when present. A failed download surfaces an error toast;
  the button shows a pending state while generating.

## Out of scope
- No seed changes. The shipped seed stays exactly as-is; on a fresh
  seed the stale list is legitimately empty (every seeded item is
  recent or already returned/closed). Tests use their own backdated
  fixtures; the live-pass screenshot may backdate one item in the
  throwaway local stack's database only.
- No changes to the spec-005 activity series semantics (per-event
  counts) — its totals can legitimately differ from §1's distinct
  items when duplicate completed claims exist; on duplicate-free data
  they agree. No recovery percentage is added to `ValueStatsCards`
  (the rate lives in `recoveryStats` only).
- No period scoping for the new dashboard blocks; no new navigation
  entries; no `statusChangedAt` field (staleness is defined on
  recorded movement, §2).

## Appendix — review dispositions (19 findings, pre-implementation)
- **F1 (critical) — adopted.** Naive returned÷lost rate can exceed
  100% and republishes the ratio 008 refused. Rate redefined over
  linked recoveries (§1); `returnedCount` stays a plain count.
- **F2 (critical) — adopted.** Two-pass canonical dedupe (§Canonical
  definitions): one physical recovery counts once.
- **F3 (critical) — adopted.** Recovery average/median restricted to
  the linked sample with published n; claim→handover published as a
  separate processing metric (§1).
- **F4 (major) — adopted.** `returnRate` is `null` on a zero
  denominator (§1).
- **F5 (major) — documented caveat.** Legacy `updatedAt` fallback
  kept for 005/008 consistency (§Canonical definitions); recorded
  handovers always carry `handedOverAt`. No schema change in this
  spec.
- **F6 (major) — adopted.** Full dedupe winner ordering: instant,
  then resolvable link, then `_id` (§Canonical definitions).
- **F7 (major) — adopted.** Negative durations excluded from the
  recovery sample and counted in `excludedNegativeDurations` (§1).
- **F8 (major) — documented.** Claim-based `returnedCount` vs the
  status breakdown can diverge only after out-of-band edits; the
  handover flow advances item status atomically (§1).
- **F9 (major) — adopted.** Claim activity on an item counts as
  movement for staleness (§2).
- **F10 (major) — documented semantics.** Any recorded staff touch
  (including a value adjustment) is movement; the brief pins
  `updatedAt`-based staleness and the list's meaning is "untouched
  cases", stated in §2.
- **F11 (major) — documented decision.** `APPROVED_FOR_HANDOVER`
  excluded from stale; it is already surfaced by both dashboards'
  urgent-queue handovers list (§2).
- **F12 (minor) — adopted.** Single `now`, server-computed `ageDays`
  from the effective movement instant, one snapshot for count+list,
  `_id` tiebreak on the stale sort (§2).
- **F13 (critical) — adopted.** One canonical dedupe shared by §1,
  §4, and 008's returned-value bucketing (§Canonical definitions).
- **F14 (major) — adopted.** Half-open month interval for every
  workbook filter; generation timestamp stamped on the summary (§4).
- **F15 (major) — adopted (labelling).** Cumulative indicators moved
  into their own headed section of the summary sheet (§4).
- **F16 (major) — adopted.** Every sheet states its basis in a title
  row; the stale sheet is stamped as a point-in-time list (§4).
- **F17 (major) — documented + tested.** Chart = per-event, recovery
  = distinct items, values share the canonical winner; the divergence
  is pinned by non-seed fixtures with duplicate/unlinked claims in
  the integration tests (Out of scope, §1).
- **F18 (minor) — adopted.** `sharePercent` computed server-side in
  the same breakdown pass; top-5 footnote (§3).
- **F19 (minor) — adopted.** Wire/display formats pinned (fraction
  4dp → percent 1dp); sample sizes published and rendered; the
  recovery metric is labelled "from the lost report's filing date"
  (§1).
