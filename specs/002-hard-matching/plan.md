# Plan: Matching Engine v2 (002)

## Design
- New module `matches/matching-text.ts`: text normalization (Arabic letter
  unification, diacritic/tatweel stripping, Arabic-Indic digit conversion),
  canonical tokens (ال/و/ب/ل prefix stripping, light suffix stemming),
  phrase + synonym canonicalization for item nouns, colors and brands
  (config lives in `config/matching.config.ts`), Levenshtein-based fuzzy
  token equality (similarity ≥ 0.8, tokens ≥ 4 chars), weighted fuzzy Dice,
  and model/identifier extraction with conflict detection.
- `matching.service.ts` v2 sub-scores: category 20, **title 20 (new)**,
  location 15, date 15, keywords 10 (fuzzy Dice over description tokens,
  Arabic + English stop words), color 10, brand 10. Thresholds unchanged
  (STRONG 80 / POSSIBLE 60). Conflict caps applied after the weighted
  score: identifier conflict → cap 59; color or brand conflict → cap 69.
  Identifier agreement boosts the title Dice (identifiers weigh ×3).
- `MatchBreakdown` gains `title` (model type + mongoose schema + client
  type). `/meta` surfaces weights from config, so it picks `title` up
  automatically.
- `matching.runner.ts` also supplies `itemTitleAr` / `descriptionAr`;
  scoring tokenizes the union of English and Arabic text.
- Seed: rewrite the 26 items' titles/descriptions as two different humans;
  recompute the 8 stored matches by running `scorePair` over the seeded
  pairs and paste the real score/level/breakdown into `matchSpecs`.

## Risks
- Incidental numbers in descriptions (room numbers) can look like model
  identifiers; seed/fixture text avoids stray differing numbers, and the
  conflict rule only fires when both sides carry identifiers with no
  agreement.
