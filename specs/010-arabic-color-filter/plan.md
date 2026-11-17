# Plan: Arabic-Aware Color Filter (010)

## Server
- `items/lostFoundItem.model.ts`: `colorGroup?: string | null` on the
  interface; schema field `{ type: String, trim: true, default: null }`;
  `lostFoundItemSchema.index({ colorGroup: 1 })`.
- `items/item.service.ts`:
  - Import `canonicalColorGroup` from `../matches/matching-text`.
  - `createItem`: `colorGroup: canonicalColorGroup(input.color)` in the
    create payload.
  - `updateItem`: inside the existing `'color' in input` branch, also
    set `item.colorGroup = canonicalColorGroup(input.color ?? undefined)`.
  - `listItems`: replace the `filter.color = /…/i` block with
    group-equality + regex fallback when the group is `null`.
- `seed/demoData.ts`: import `canonicalColorGroup`; add
  `colorGroup: canonicalColorGroup(spec.color)` to the story item docs
  and `canonicalColorGroup(pair.color)` to both historical-pair docs;
  historical singles get `colorGroup: null` explicitly (they already
  pass `color: undefined`).

## Tests — `server/tests/integration/color-filter.test.ts`
Repl-set + seed pattern from `item-value.test.ts`:
- Seeded battery as STUDENT on `GET /api/v1/lost-found/items`:
  «فضي» ≡ "Silver" ≡ "silver" ≡ «سيلفر» (identical id sets, non-empty,
  total equals the DB count of silver-group items); «كحلي» ≡ «أزرق
  غامق» ≡ "Navy"; «اسود» ≡ "Black"; «رمادي» ≡ "Grey".
- A nonsense color («مخطط فسفوري»-style token with no group members in
  the data) returns 200 with an empty list.
- Pagination: `color=فضي&limit=2` reports the full silver total.
- Create → the stored doc carries `colorGroup: 'silver'` (model-level
  check) and the item is findable by «فضي»; PATCH its color to 'Black'
  → `colorGroup: 'black'`, findable by «اسود», no longer by «فضي».

## Verification
- Full server suite green (204 existing + new), root typecheck 0.
- Live pass: student on Browse, advanced color filter «فضي» narrows to
  the silver item(s); "Silver" yields the identical set; screenshot
  `design010-color-filter-arabic.png`; 0 errors.
- clean-code-guard + test-guard over the diff; separate commit.
