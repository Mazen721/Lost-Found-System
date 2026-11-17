# Tasks: Staff Analytics Pack (011)

## Workstream 0 — TopNavbar overflow fix (user-reported, added mid-spec)
- [x] W1. Trim staff top links to ≤5 per role (Admin: dashboard,
      statistics, users, all-reports, claims; Manager: dashboard,
      statistics, matches, claims, all-reports). Trimmed destinations
      stay in the drawer (full menu untouched); nav tests updated +
      reachability pins added.
- [x] W2. Structural defence: links container `min-w-0` +
      `overflow-hidden`; actions `flex-none`; menu button `flex-none`
      + `whitespace-nowrap`.
- [x] W3. Regression check: bounding-box overlap assertion over every
      visible navbar child, every role's landing page, 1440px +
      1280px — FAILS pre-fix (admin: «تصفّح المفقودات» × «القائمة»),
      must PASS post-fix. Screenshots design011-navbar-fixed-{admin,
      manager}.png at 1280px.

## Spec + review
- [x] R1. spec.md with every definition pinned.
- [x] R2. Zero-context reviewer attack on the semantics (19 findings);
      dispositions folded into spec.md (appendix) + plan.md.

## Server
- [x] S1. Canonical return machinery: `handoverInstant`,
      `selectCanonicalReturns`, `summarizeRecovery`, `getRecoveryStats`.
- [x] S2. 008 alignment: `sumReturnedItemValues` uses the canonical
      winner order.
- [x] S3. Stale: `computeStaleItems` (claim-movement aware, single
      snapshot) + payload summary (cap 20).
- [x] S4. `getBreakdowns`: locationsTop gains lost/found/sharePercent.
- [x] S5. Wire recoveryStats + staleItems + staleCount into Admin +
      Manager builders; student payload untouched.
- [x] S6. Export: exceljs dependency, `dashboard.report.ts`,
      `GET /dashboard/report.xlsx` route + controller.

## Client
- [x] C1. Types: RecoveryStats, StaleItem, payload fields, locations
      split + sharePercent.
- [x] C2. statisticsModel.ts (rate format, alert visibility, remainder).
- [x] C3. RecoveryStatsCards on the Statistics page.
- [x] C4. StaleItemsSection on the Statistics page; StaleItemsAlert on
      both staff dashboards (only when staleCount > 0).
- [x] C5. Locations block: split bars + split detail + share %.
- [x] C6. Export button + apiDownload helper + dashboardApi method;
      ar.ts strings.

## Tests & verification
- [x] T1. Server unit: recovery-stats pure helpers.
- [x] T2. Server integration: staff analytics fixtures (recovery math,
      stale boundary/cap, locations split, export read-back, gating).
- [x] T3. Server integration: empty-state file (zero payload, export
      401, zero workbook).
- [x] T4. Client tests: statisticsModel.
- [x] T5. Root typecheck, full server suite, client suite, client build.
- [x] T6. Live browser pass + design011-*.png screenshots (throwaway
      backdated item for the stale surfaces).
- [x] T7. clean-code-guard + test-guard over the diff.
- [x] T8. Commit on lost-found-only; bundle regenerated + clone-verified.
