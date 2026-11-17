# Plan: Dedicated Statistics Page for Staff (009)

## Server — `server/src/modules/dashboard/dashboard.service.ts`
- New exported interface `DashboardBreakdowns` and a shared
  `getBreakdowns()` helper next to `getValueStats()`:
  - Category aggregation: `$group` by `{ category, reportType }`, then
    zero-fill over `LOST_FOUND_CATEGORIES` (import it from constants)
    and sort by total desc.
  - Status aggregation: `$group` by `status`, zero-fill over
    `ITEM_STATUSES` (already imported).
  - Locations: `$group` by `locationId`, sort desc, `$limit: 5`, then
    hydrate names with one `Location.find({ _id: { $in } })` and
    re-order in JS. Display name = `buildingName — room` (Arabic pair
    likewise), falling back to the building alone.
- `AdminDashboard` / `ManagerDashboard` interfaces gain
  `breakdowns: DashboardBreakdowns`; both builders compute it in the
  existing `Promise.all` alongside `getBoardExtras()` / `getValueStats()`.
- Student builder untouched → the field is structurally absent for
  students/employees, same as `valueStats`.

## Client
- `client/src/types/dashboard.ts`: `DashboardBreakdowns` interface +
  `breakdowns` on the Admin/Manager dashboard types.
- New `client/src/features/dashboard/StatisticsPage.tsx`:
  - `useQuery(['dashboard', user.id, user.role, 'all'], () => dashboardApi.get('all'))`
    with the same Loading/Error states pattern as other pages.
  - `PageHeader` (title/description from new ar.ts keys), then
    `ActivityChart`, then `ValueStatsCards` (moved, not modified),
    then a `BreakdownsSection` rendering the three breakdown cards as
    bar rows (width % of the block's max) using the ActivityChart
    section shell classes.
  - Category/status labels via `enumLabel('category' | 'itemStatus', …)`
    — check `enums.*` keys in ar.ts; fall back to existing groups.
- `AdminDashboard.tsx` / `ManagerDashboard.tsx`: drop the
  `ValueStatsCards` import + element only.
- Router: `<Route path="statistics" element={<StatisticsPage />} />`
  inside the existing `LOST_FOUND_MANAGER`/`SUPER_ADMIN`
  `ProtectedRoute` group.
- Navigation (`client/src/components/shared/navigation.ts`): `BarChart3`
  icon; statistics item right after the dashboard item in both staff
  drawer menus (overview group) and both staff top-link lists.
- ar.ts: `nav.statistics` + `dashboard.statistics*` /
  `dashboard.breakdowns*` strings.

## Tests
- Server: new `server/tests/integration/dashboard-breakdowns.test.ts`
  (repl-set + seed pattern from `item-value.test.ts`):
  - Admin + Manager payloads carry `breakdowns`; category totals and
    status counts each sum to `LostFoundItem.countDocuments({})`.
  - `locationsTop` ≤ 5, strictly non-increasing counts, top entry's
    count equals a direct DB aggregation for that location.
  - Creating one item moves its category/status/location counts by +1.
  - Student + Employee payloads contain neither `breakdowns` nor
    `valueStats`.
- Client: `client/tests/navigation.test.ts` — update the two staff
  top-link exact arrays; new describe asserting `/statistics` sits
  right after `/dashboard` in staff top links + drawer, and appears on
  no student/employee surface.
- Full suites + typecheck + build, then a live pass on the seeded
  stack (admin/manager page render, dashboards without value cards,
  student blocked), screenshots `design009-*.png`.
- clean-code-guard + test-guard over the diff before committing.
