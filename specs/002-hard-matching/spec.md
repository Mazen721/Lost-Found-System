# Feature Spec: Hard-Case Matching (002)

## Problem
The demo seed wrote identical titles/descriptions on both sides of every
lost/found pair, so the deterministic matcher looked smart while only ever
solving the trivial case. Real students write like two different humans:
synonyms (شنطة / حقيبة), dialect (ضهر، ميه، كحلي), missing model or brand,
Arabic-Indic digits (٣٢), typos, and mixed Arabic/English.

## Requirements
- The matcher must pair messy real-world reports of the same item at STRONG
  level, and must refuse to call different items STRONG: conflicting model
  numbers (iPhone 13 vs 12, fx-991 vs fx-570, 32GB vs 64GB) score below
  POSSIBLE; conflicting color or brand caps the pair at POSSIBLE.
- Scoring stays deterministic and pure (no external APIs / AI), with the
  existing hard filters (report type, incompatible category, found more
  than a day before lost).
- Arabic text must drive matching: normalization of Arabic letter forms,
  diacritics/tatweel, Arabic-Indic digits, Arabic stop words, synonym and
  transliteration groups for items, colors and brands, and fuzzy
  (typo-tolerant) token comparison. The Arabic title/description fields
  feed scoring alongside the English ones.
- The seed's 12 pairs are rewritten as two different humans would write
  them; the 8 stored seed matches carry the engine's real computed
  score/level/breakdown.

## Acceptance
- Edge-case battery `server/tests/unit/matching-hard-cases.test.ts` green.
- Full server suite green; typecheck clean.
- Seeded matches in the database equal the engine's output for the pairs.
