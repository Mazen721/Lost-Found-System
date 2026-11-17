# Tasks: Arabic-Aware Color Filter (010)

## Server
- [x] S1. Item model: `colorGroup` field + index.
- [x] S2. Item service: compute on create, recompute on color update,
      group-equality list filter with regex fallback.
- [x] S3. Seed: `colorGroup` on story + historical-pair docs
      (singles: null). SEED CHANGED — user re-runs `npm run seed`.

## Tests & verification
- [x] T1. Integration battery: Arabic/English/mixed spellings return
      identical sets on seeded data; nonsense color → empty 200;
      pagination totals; create/update maintain `colorGroup`.
- [x] T2. Root typecheck + full server suite green.
- [x] T3. Live browser pass (student Browse, «فضي» vs "Silver") +
      `design010-color-filter-arabic.png`.
- [x] T4. clean-code-guard + test-guard over the diff.
- [x] T5. Commit spec 010 separately on lost-found-only; regenerate +
      clone-verify the bundle.
