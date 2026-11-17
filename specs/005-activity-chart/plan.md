# Plan: Activity Chart (005)

## Diagnosis (verified in code)
- Dashboard module: `server/src/modules/dashboard/` — single
  `GET /dashboard` route (authenticate + role-shaped payload in
  `dashboard.service.ts`). All existing range filtering uses `createdAt`
  (`createdAtMatch`), so lost/found series bucket by `createdAt` too.
- "Returned" has a real event timestamp: `claim.service.ts`
  `recordHandover()` sets `claim.status = 'COMPLETED'` and
  `claim.handover.handedOverAt = new Date()`, then marks the found item
  (and any linked lost item) RETURNED. Counting completed handovers by
  `handedOverAt` counts each physical return exactly once; the item's own
  `updatedAt` would double-count pairs and drift on later edits.
- Client dashboards fetch via react-query (`dashboardApi.get`) and compose
  section components (`AdminCharts`, `ManagerCharts`, self-fetching
  ledgers). `recharts@^2.15.0` is a declared client dependency (unused so
  far) — the chart uses it.
- Seed: `demoData.ts` story items span up to 50 days ago; the two story
  handovers are 2 days ago. Historical items start ≥ 35 days ago so the
  `month` window stays story-only and integration assertions stay exact.

## Changes
1. `dashboard.validation.ts`: `ACTIVITY_RANGES`, `ActivityRange`,
   `activitySeriesQuerySchema` (`range` enum, default `month`).
2. `dashboard.service.ts`:
   - Pure helpers: `buildActivityBuckets(range, now)` →
     `{ key, date, start, end }[]` (day buckets keyed `yyyy-MM-dd`, month
     buckets keyed `yyyy-MM`, `date` = ISO day label); `bucketizeDates`
     (assign Dates to buckets, out-of-window ignored);
     `assembleActivitySeries` (zero-fill + totals).
   - `getActivitySeries(range, now)`: two lean queries — items
     (`reportType`, `createdAt`) and completed claims
     (`handover.handedOverAt`, `updatedAt`) within the window — tallied
     in JS so bucket boundaries and counts share one definition of a day
     (server-local, via date-fns) with no DB timezone mismatch.
3. `dashboard.controller.ts` + `dashboard.routes.ts`:
   `GET /dashboard/activity-series` with
   `authorizeRoles('SUPER_ADMIN', 'LOST_FOUND_MANAGER')` + query validation.
4. Client:
   - `types/dashboard.ts`: `ActivityRange`, `ActivityBucket`,
     `ActivitySeries`.
   - `dashboardApi.ts`: `getActivitySeries(range)`.
   - `features/dashboard/activityChartModel.ts`: series config
     (keys/colors/label keys), `summarizeActivity` (header totals),
     `formatActivityBucketLabel` / tooltip model builder — pure, testable.
   - `features/dashboard/ActivityChart.tsx`: self-fetching card
     (react-query), range tabs, recharts `AreaChart` (overlapping areas,
     rose/amber/emerald), custom Arabic tooltip, legend, header totals,
     loading skeleton + empty state matching existing dashboard cards.
     X axis reversed under RTL so the timeline reads right-to-left.
   - `AdminDashboard.tsx` / `ManagerDashboard.tsx`: render
     `<ActivityChart />` after `RecentItemsStrip`.
   - `ar.ts`: `dashboard.activity*` strings.
5. Seed (`demoData.ts`): `HISTORICAL` block after the story claims —
   12 lost/found pairs (both RETURNED, one COMPLETED claim + handover
   each) + 12 CLOSED singles, spread 40–334 days ago, reported by the
   extra seed users (never the demo student, whose dashboard assertions
   are exact). Report numbers continue LF-2027…, claims CLM-2010….
   `DemoDataCounts` includes the historical records.
6. Tests:
   - Unit `server/tests/unit/activity-series.test.ts`: bucket shapes for
     all ranges against a fixed `now`, boundary assignment, zero-fill,
     totals.
   - Integration (day6): auth matrix (admin/manager 200, student/employee
     403), bucket counts per range, exact seeded totals per window
     (week 5/7/2, month 9/12/2, year 30/32/14), invalid range 400;
     updated seed/KPI counts (62 items, 21 claims, totals 30/32,
     completedHandovers 14).
   - Client `client/tests/activityChart.test.ts`: totals summarizer,
     bucket label formatting, tooltip model rows.
