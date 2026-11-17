/**
 * ══════════════════════════════════════════════════════════════════════
 *  PRICE BOOK — the single source of truth for item-value estimation
 *  (specs/008-item-value). EVERY price the estimator can produce lives
 *  in this file and nowhere else. Refreshing prices = editing this one
 *  module; the estimator logic in item-value.ts never changes for a
 *  price refresh.
 * ══════════════════════════════════════════════════════════════════════
 *
 * Where these numbers come from:
 *  - They are CURATED REFERENCE PRICES, picked by hand — deliberately
 *    NOT live marketplace data. A stored estimate must be stable: an
 *    item reported in March should not silently change value in April
 *    because some listing somewhere moved. Live prices are volatile,
 *    unverifiable, and would make the staff impact stats irreproducible.
 *  - Each figure is a typical USED-market MID-RANGE value in EGP —
 *    what a second-hand item in ordinary condition actually changes
 *    hands for in Egypt — NOT the new-retail price. Students lose used
 *    phones, used bags, used chargers.
 *  - Figures are current as of NOVEMBER 2026 and should be REVIEWED
 *    PERIODICALLY (e.g. once a semester): re-check a handful of common
 *    items against the used market and adjust the bands that drifted.
 *
 * How to read the numbers:
 *  - Bands are deliberately WIDE (budget / mid / premium per category).
 *    Normal market drift moves a price inside its band, so the estimate
 *    stays plausible for a long time without any edit here. The stored
 *    number is the band's representative value, and every user-facing
 *    surface labels it «تقديرية» (estimated) — it is an impact
 *    statistic, not an appraisal.
 *  - Outliers are NOT handled by chasing exact prices in this table:
 *    staff can adjust any single item's value by hand
 *    (PATCH /lost-found/items/:id/value), which is the intended escape
 *    hatch for the unusually expensive or worthless item.
 */
import type { LostFoundCategory } from '../../../config/constants';

/** Global sanity bounds: no estimate or staff adjustment leaves this range. */
export const VALUE_MIN_EGP = 20;
export const VALUE_MAX_EGP = 150_000;

export type BrandTier = 'premium' | 'mid' | 'budget';

export interface CategoryBand {
  budget: number;
  mid: number;
  premium: number;
}

/** Representative used-market value per category × brand tier (EGP). */
export const CATEGORY_BANDS: Record<LostFoundCategory, CategoryBand> = {
  Phones: { budget: 6_000, mid: 15_000, premium: 45_000 },
  Laptops: { budget: 15_000, mid: 30_000, premium: 60_000 },
  Electronics: { budget: 500, mid: 2_000, premium: 8_000 },
  Headphones: { budget: 400, mid: 1_500, premium: 7_000 },
  Wallets: { budget: 200, mid: 600, premium: 2_500 },
  Bags: { budget: 400, mid: 1_200, premium: 4_000 },
  Keys: { budget: 100, mid: 200, premium: 400 },
  Documents: { budget: 50, mid: 100, premium: 200 },
  Accessories: { budget: 300, mid: 1_000, premium: 3_500 },
  Books: { budget: 150, mid: 400, premium: 1_200 },
  Clothing: { budget: 300, mid: 800, premium: 2_500 },
  Other: { budget: 200, mid: 500, premium: 1_500 },
};

/** No-brand, no-model phone reports lean budget on a campus (E4). */
export const PHONE_NO_BRAND_DEFAULT_EGP = 9_000;
/** Samsung without an S-model signal is most likely a Galaxy A (E3). */
export const SAMSUNG_NO_MODEL_EGP = 12_000;

export const TIER_BY_BRAND_GROUP: Record<string, BrandTier> = {
  apple: 'premium',
  sony: 'premium',
  bose: 'premium',
  beats: 'premium',
  northface: 'premium',
  nike: 'premium',
  adidas: 'premium',
  microsoft: 'premium',
  rayban: 'premium',
  dyson: 'premium',
  samsung: 'mid',
  xiaomi: 'mid',
  huawei: 'mid',
  honor: 'mid',
  oppo: 'mid',
  vivo: 'mid',
  anker: 'mid',
  casio: 'mid',
  logitech: 'mid',
  jbl: 'mid',
  kingston: 'mid',
  thermos: 'mid',
  dell: 'mid',
  hp: 'mid',
  lenovo: 'mid',
  asus: 'mid',
  acer: 'mid',
  realme: 'budget',
  infinix: 'budget',
  tecno: 'budget',
  itel: 'budget',
};

/**
 * Brand aliases the matching engine does not know, keyed by their
 * normalized token form (normalizeText output: ة→ه, أ→ا, …).
 */
export const BRAND_ALIASES = new Map<string, string>([
  ['oppo', 'oppo'],
  ['اوبو', 'oppo'],
  ['realme', 'realme'],
  ['ريلمي', 'realme'],
  ['vivo', 'vivo'],
  ['فيفو', 'vivo'],
  ['infinix', 'infinix'],
  ['انفينكس', 'infinix'],
  ['انفنكس', 'infinix'],
  ['honor', 'honor'],
  ['هونر', 'honor'],
  ['اونر', 'honor'],
  ['tecno', 'tecno'],
  ['تكنو', 'tecno'],
  ['itel', 'itel'],
  ['ايتل', 'itel'],
  ['poco', 'xiaomi'],
  ['بوكو', 'xiaomi'],
  ['redmi', 'xiaomi'],
  ['ريدمي', 'xiaomi'],
  ['beats', 'beats'],
  ['بيتس', 'beats'],
  ['bose', 'bose'],
  ['بوز', 'bose'],
  ['logitech', 'logitech'],
  ['لوجيتك', 'logitech'],
  ['microsoft', 'microsoft'],
  ['مايكروسوفت', 'microsoft'],
  ['macbook', 'apple'],
  ['asus', 'asus'],
  ['اسوس', 'asus'],
  ['acer', 'acer'],
  ['ايسر', 'acer'],
  ['dyson', 'dyson'],
  ['دايسون', 'dyson'],
  ['rayban', 'rayban'],
]);

/** Premium laptop lines: the only way dell/hp/lenovo reach the top band. */
export const PREMIUM_LAPTOP_LINE_TOKENS = new Set([
  'xps',
  'spectre',
  'elitebook',
  'thinkpad',
  'legion',
  'zenbook',
  'yoga',
]);

/** Used-market value by iPhone generation (EGP). */
export const IPHONE_MODEL_VALUES: Record<number, number> = {
  11: 15_000,
  12: 22_000,
  13: 28_000,
  14: 34_000,
  15: 42_000,
  16: 50_000,
  17: 58_000,
};

/** Used-market value by Galaxy S generation (EGP). */
export const GALAXY_S_MODEL_VALUES: Record<number, number> = {
  21: 15_000,
  22: 20_000,
  23: 28_000,
  24: 38_000,
  25: 48_000,
};

/** Galaxy A series, keyed by the model's first digit (A1x…A7x). */
export const GALAXY_A_FIRST_DIGIT_VALUES: Record<string, number> = {
  '1': 7_000,
  '2': 8_500,
  '3': 10_000,
  '4': 12_000,
  '5': 14_000,
  '7': 17_000,
};

export interface AccessoryPattern {
  tokens: string[];
  phrases: string[];
  valueEGP: number;
}

/**
 * Small accessories are priced as themselves whatever category the
 * reporter filed them under — a charger is not a laptop.
 */
export const ACCESSORY_PATTERNS: AccessoryPattern[] = [
  {
    tokens: ['powerbank'],
    phrases: ['power bank', 'باور بانك', 'باوربانك'],
    valueEGP: 1_100,
  },
  {
    tokens: ['usb', 'flash', 'فلاشه'],
    phrases: ['flash drive', 'ذاكره فلاش'],
    valueEGP: 450,
  },
  {
    tokens: ['case', 'cover', 'جراب', 'حافظه', 'غطاء'],
    phrases: [],
    valueEGP: 500,
  },
  {
    tokens: ['charger', 'cable', 'شاحن', 'كابل', 'كيبل', 'وصله'],
    phrases: ['charging cable'],
    valueEGP: 700,
  },
];

/** Recognisable sub-types hiding inside the generic Electronics/Other categories. */
export const SUBCATEGORY_VALUES = {
  tabletEGP: 15_000,
  smartwatchEGP: 6_000,
} as const;
