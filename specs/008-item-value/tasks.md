# Tasks: Automatic Item-Value Estimation + Staff Impact Stats (008)

## Server
- [x] S1. `items/item-value.price-book.ts`: ALL price data in one
      commented config module (category bands, brand tiers incl. Arabic
      aliases, iPhone/Galaxy model tables, clamp bounds [20, 150000]) —
      curated used-market mid-range EGP, Nov 2026, provenance header.
      `items/item-value.ts`: deterministic estimator logic importing
      the price book, returning `{ valueEGP, rule, brandGroup, tier }`.
- [x] S2. Item model: `estimatedValueEGP`, `valueSource`,
      `valueAdjustedBy`, `valueAdjustedAt`.
- [x] S3. Projection: `ProjectableItem` value fields + `itemValueFields()`
      helper; `toPublicItem` unchanged.
- [x] S4. Item service: staff-gated serialization (list/detail/create),
      AUTO estimate at creation, `adjustItemValue` + activity log.
- [x] S5. Validation + route + controller for `PATCH /items/:id/value`
      (staff-only; 400/401/403 semantics).
- [x] S6. Claims serializer: value fields for staff on claim item +
      linked lost item; populate select extended for managers.
- [x] S7. Matches serializer: value fields on embedded items (staff-only
      module).
- [x] S8. Dashboard: `valueStats` on Admin + Manager payloads (month +
      all-time lost/returned, spec-005 returned semantic); student
      payload untouched.
- [x] S9. Seed: estimator applied to story + historical pair + historical
      single item docs.

## Client
- [x] C1. Types: `LostFoundItem` value fields; dashboard `valueStats`.
- [x] C2. `itemsApi.adjustValue`.
- [x] C3. `ItemValueCard` on staff item detail + adjust dialog.
- [x] C4. Registry `ReportsTable` value column (staff payloads only).
- [x] C5. `ValueStatsCards` on Admin + Manager dashboards.
- [x] C6. ar.ts strings (value card, dialog, dashboard cards, activity
      log template).

## Tests & verification
- [x] T1. Unit battery for the estimator.
- [x] T2. Integration: privacy (student/employee field-free payloads),
      staff visibility, adjustment permissions/validation, stats math
      incl. month boundary + adjusted value.
- [x] T3. Root typecheck, full server suite, client suite, client build.
- [ ] T4. Live browser pass + `design008-*.png` screenshots.
      (Deferred to the parent agent's live-browser session — API-level
      behaviour is fully covered by T2; the UI pass must confirm:
      manager item value + real adjustment, Admin/Manager dashboard
      cards vs API, student DOM contains no value, 0 console errors.)
- [x] T5. clean-code-guard + test-guard over the diff.
- [ ] T6. Commits, bundle regeneration (HEAD + branch), clone-verify.
      Flag: SEED CHANGED — user must run `npm run seed`.
