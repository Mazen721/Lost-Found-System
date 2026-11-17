# Tasks: Dedicated Statistics Page for Staff (009)

## Server
- [x] S1. `dashboard.service.ts`: `DashboardBreakdowns` interface +
      `getBreakdowns()` (category zero-filled + sorted, status
      zero-filled, top-5 locations with names).
- [x] S2. Wire `breakdowns` into Admin + Manager dashboard builders;
      student payload untouched.

## Client
- [x] C1. Types: `DashboardBreakdowns` + fields on Admin/Manager types.
- [x] C2. `StatisticsPage` (chart → value cards → breakdown bar rows).
- [x] C3. Remove `ValueStatsCards` from Admin + Manager dashboards
      (chart stays).
- [x] C4. Route `/statistics` in the staff ProtectedRoute group.
- [x] C5. Nav: statistics entry after dashboard in staff drawer menus
      + top links; ar.ts strings.

## Tests & verification
- [x] T1. Server integration: breakdown sums, top-locations order,
      +1 shift on create, staff-only gating.
- [x] T2. Client nav tests: updated staff arrays + statistics
      placement/absence assertions.
- [x] T3. Root typecheck, full server suite, client suite, client build.
- [x] T4. Live browser pass + `design009-*.png` screenshots.
- [x] T5. clean-code-guard + test-guard over the diff.
- [x] T6. Commit spec 009 separately on lost-found-only.
