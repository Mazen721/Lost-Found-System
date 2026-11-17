# Feature Spec: Arabic-Aware Color Filter (010)

## Background
Found during spec 006's live pass and confirmed against the API: the
items-list color filter matched only the stored English color text.
Typing «فضي» in the advanced color filter returned **0 results** while
"Silver" returned the item. The product is Arabic-only — an Arabic
color query must work.

The fix's core already exists: `canonicalColorGroup` in
`server/src/modules/lost-found/matches/matching-text.ts` maps spelling,
dialect and language variants onto one group (فضي / سيلفر / silver →
`silver`; كحلي / navy / أزرق غامق → `navy`; unknown colors form their
own group from their normalized text, symmetrically on both sides).

## Requirements

### 1. Stored derived field
- `LostFoundItem` gains `colorGroup: string | null` (+ index),
  computed as `canonicalColorGroup(color)`:
  - at item creation (report flow),
  - whenever `color` changes on item update,
  - in the seed for every seeded item (story specs, historical pairs,
    historical singles — singles have no color → `null`).
- **Seed data changes in this spec** — the user must re-run
  `npm run seed` after merging.

### 2. List filtering
- When the `color` query param is present, canonicalize the query with
  the same function and filter by `colorGroup` equality **in the Mongo
  query** (pagination and totals stay correct — no in-memory
  post-filtering).
- If the query canonicalizes to `null` (no usable tokens), fall back to
  the previous behaviour (case-insensitive substring match on the raw
  `color` field) so nothing regresses.
- English behaviour must not change: "Silver", "silver", «فضي» and
  «سيلفر» all return exactly the same set of items.

### 3. Privacy / surface
- `colorGroup` is an internal derived field: it is **not** added to the
  public item serializer.

## Out of scope
- The brand filter (same class of issue, separate follow-up if wanted).
- Free-text search `q` (already covered by matching v2 elsewhere).
