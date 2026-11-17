/**
 * Deterministic Lost & Found matching configuration (MASTER_SPEC section 6.3).
 * The scoring service is added in Day 5; the weights live here from Day 1 so the
 * `GET /meta` endpoint and unit tests share one source of truth.
 */
export const MATCHING_WEIGHTS = {
  category: 20,
  title: 20,
  location: 15,
  date: 15,
  color: 10,
  brand: 10,
  keywords: 10,
} as const;

export const MATCHING_THRESHOLDS = {
  STRONG: 80,
  POSSIBLE: 60,
} as const;

/**
 * Score caps (v2): contradictory evidence must not be outvoted by agreeing
 * evidence. A model/identifier conflict means a different item, so the pair
 * stays below POSSIBLE; a color or brand conflict still allows POSSIBLE but
 * never STRONG.
 */
export const MATCHING_CAPS = {
  IDENTIFIER_CONFLICT: 59,
  ATTRIBUTE_CONFLICT: 69,
} as const;

export const KEYWORD_STOP_WORDS = [
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'he',
  'her',
  'his',
  'i',
  'in',
  'is',
  'it',
  'its',
  'my',
  'of',
  'on',
  'or',
  'our',
  'she',
  'that',
  'the',
  'their',
  'them',
  'there',
  'they',
  'this',
  'to',
  'was',
  'we',
  'were',
  'with',
  'you',
  'your',
  // Arabic (post-normalization forms: ة→ه, hamza variants→ا)
  'في',
  'من',
  'علي', // على after ى→ي unification
  'عند',
  'بعد',
  'قبل',
  'هذا',
  'هذه',
  'ذلك',
  'التي',
  'الذي',
  'انا',
  'هو',
  'هي',
  'مع',
  'عن',
  'الي', // إلى after unification
  'او',
  'ثم',
  'قد',
  'لقد',
  'جدا',
  'بس',
  'يعني',
  'كده',
  'ايضا',
  'لقيت', // finder filler verbs carry no item signal
  'لقيتها',
  'لقيته',
  'وجدت',
  'عثرت',
  'ضاعت',
  'ضاع',
  'فقدت',
  'تركت',
  'نسيت',
] as const;

export type MatchingWeights = typeof MATCHING_WEIGHTS;
export type MatchingThresholds = typeof MATCHING_THRESHOLDS;
