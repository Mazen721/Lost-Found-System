# Plan: Staff Analytics Pack (011)

Semantics are pinned in `spec.md` (including the appendix of review
dispositions — the spec was attacked by a zero-context reviewer before
this plan was written; findings F1–F19 are folded in there).

## Server — `server/src/modules/dashboard/dashboard.service.ts`
- Canonical return machinery next to `getValueStats()`:
  - `handoverInstant(claim)` = `handover.handedOverAt ?? updatedAt`.
  - `compareCanonicalClaims(a, b)`: handover instant asc → claim with
    a `linkedLostItemId` first (cheap pre-sort key; resolvability is
    confirmed during summarisation) → `_id` asc.
  - `selectCanonicalReturns(claims)`: sort by the comparator, first
    claim per `itemId`, then first claim per non-null
    `linkedLostItemId`. Pure + exported for unit tests.
  - `summarizeRecovery(claims, lostItemCreatedAtById, totalLostReports)`:
    pure; computes the whole `RecoveryStats` from the canonical set —
    a link counts as resolvable only when the map holds the id (the
    caller fills the map with LOST items only). Negative linked
    durations are excluded + counted; processing durations are
    computed for every canonical claim (negatives excluded from that
    mean via `claimSampleSize`). Exported for unit tests.
  - `getRecoveryStats(now)`: loads COMPLETED claims
    (`itemId linkedLostItemId handover updatedAt createdAt`), the
    linked LOST items' `createdAt`s, and the LOST count; delegates to
    the pure helpers.
- 008 alignment (F13): `sumReturnedItemValues` iterates
  `selectCanonicalReturns(...)`-ordered claims so the value bucketing
  winner is the canonical one. The claimed item's value is read from
  the populated item exactly as today.
- Stale: internal `computeStaleItems(now)` returns the full sorted
  array + count from one snapshot: candidates by status, one
  aggregation for the latest claim `updatedAt` per `itemId`, movement
  = max(item.updatedAt, claim max). `getStaleSummary(now)` slices the
  payload shape (cap 20) and is exported for the export builder.
  Reporter role + building names via `populate` on the candidate
  query (same pattern as `getBoardExtras`).
- `getBreakdowns()`: location aggregation groups by
  `{ locationId, reportType }`; entries gain `lost`, `found`,
  `sharePercent` (denominator = the status aggregation's total from
  the same call).
- `AdminDashboard` / `ManagerDashboard` interfaces gain
  `recoveryStats: RecoveryStats`, `staleItems: StaleItem[]`,
  `staleCount: number`; both builders add `getRecoveryStats()` +
  `getStaleSummary()` to their existing `Promise.all`. Student
  builder untouched → fields structurally absent for students.

## Server — monthly export
- New `server/src/modules/dashboard/dashboard.report.ts`:
  `buildMonthlyReport(now): Promise<{ buffer: Buffer; filename: string }>`.
  Uses `getValueStats`, `getRecoveryStats`, `computeStaleItems`
  (exported from the service), plus month-scoped item/category/
  location aggregations and the canonical in-month returns count
  (recompute the canonical set inside the report builder from the
  same loaders — factor a `loadCanonicalReturns()` in the service if
  duplication appears). Sheets per spec §4 with basis title rows;
  Arabic month label via `Intl.DateTimeFormat('ar-EG', …)`.
- `exceljs` added to server dependencies
  (`npm install exceljs -w @campuscare-lost-found/server`).
- Route: `GET /dashboard/report.xlsx` in `dashboard.routes.ts` with
  `authorizeRoles('SUPER_ADMIN', 'LOST_FOUND_MANAGER')` (authenticate
  already applies router-wide); controller sets Content-Type +
  RFC 5987 Content-Disposition and sends the buffer.

## Client
- `client/src/types/dashboard.ts`: `RecoveryStats`, `StaleItem`
  interfaces; Admin/Manager payload types gain `recoveryStats`,
  `staleItems`, `staleCount`; `locationsTop` entries gain `lost`,
  `found`, `sharePercent`.
- `client/src/features/dashboard/statisticsModel.ts` (new, pure):
  `formatReturnRate(rate: number | null): string` (Intl percent,
  1dp, ar-EG latn digits; «—» for null), `shouldShowStaleAlert(count)`,
  `staleRemainder(count, shown)`.
- `RecoveryStatsCards.tsx` (new): PortalSummaryGrid, 4 metrics per
  spec §1 (returned / rate / recovery avg / processing avg).
- `StaleItemsAlert.tsx` (new): renders null unless `count > 0`;
  amber alert card, count + link to `/statistics`. Wired into
  `AdminDashboard` and `ManagerDashboard` right after the summary
  grid.
- `StaleItemsSection.tsx` (new): statistics-page list + empty state +
  remainder note; rows link to `/lost-found/items/:id`.
- `StatisticsPage.tsx`: PageHeader gains the export action;
  `RecoveryStatsCards` after `ValueStatsCards`; locations block
  becomes a dedicated split-bar list (segments: lost = primary,
  found = gold) with split detail + `sharePercent`; `StaleItemsSection`
  last; top-5 footnote on the locations card.
- `dashboardApi.downloadMonthlyReport()`: authenticated fetch via a
  new `apiDownload` helper in `client/src/lib/api.ts` (Bearer token,
  blob, filename from Content-Disposition `filename*` with a
  client-computed Arabic fallback). Errors → toast.error; pending
  state on the button.
- `client/src/i18n/locales/ar.ts`: all new strings under `dashboard.*`.

## Tests
- Server unit (`server/tests/unit/recovery-stats.test.ts`): canonical
  ordering + both dedupe passes, tiebreaks (equal instant → linked →
  `_id`), median odd/even, linked-only sample, negative exclusion +
  counter, rate null on zero denominator, rate bound ≤ 1 with
  unlinked returns present.
- Server integration (`dashboard-staff-analytics.test.ts`): minimal
  seed + model-built fixtures with backdated timestamps (the
  item-value test pattern). Sequential describes: recovery math
  against exact fixture numbers → locations split + share →
  stale boundary (exactly 14d in, 13d23h out), status eligibility,
  claim-movement rescue, cap 20/order/count 27 → export read-back via
  exceljs (sheet names, basis rows, figures recomputed independently
  in-test from the DB) → gating (student payload string-level absence;
  export 403).
- Server integration (`dashboard-staff-analytics-empty.test.ts`):
  foundation-only seed → zero-state payload (rate null, counts 0,
  stale empty), export 401 unauthenticated + a zero workbook that
  still opens with the four sheets.
- Client (`client/tests/statisticsModel.test.ts`): rate formatting
  (fraction → percent, null → «—»), alert visibility, remainder math.
- Full gates: root typecheck, server suite (212 existing must stay
  green — watch the 008 item-value tests after the dedupe-winner
  refactor), client suite, client production build.

## Live pass (seeded stack, throwaway DB)
- In-memory repl-set + full seed + server :5000 + client :5173
  (the lf008 pattern). Insert ONE backdated OPEN item directly into
  the throwaway DB (never the seed files) so the stale surfaces have
  content.
- pass011.mjs (puppeteer): admin + manager statistics pages (recovery
  cards, split locations, stale section), dashboard stale alert +
  click-through, export download captured via CDP to disk and read
  back with exceljs, student payload + /statistics forbidden checks,
  console/page errors filtered like pass010.
- Screenshots: `design011-statistics-recovery.png`,
  `design011-stale-alert.png`, `design011-export.png`.

## Guards + delivery
- clean-code-guard + test-guard self-checks over the full diff; fix
  findings before committing.
- Commit on `lost-found-only`; regenerate the bundle with HEAD +
  branch refs; clone-verify. NO seed changes — the user's update is
  fetch/merge/push only (plus the one-time `npm install` for exceljs,
  which the bundle/merge brings via package.json — flag it in the
  report).
