/**
 * Deterministic estimator for Lost & Found item values
 * (specs/008-item-value). The user rejected manual price capture, so an
 * item's approximate EGP value is computed from fields already collected
 * (category, brand, title, description) and staff may adjust it later.
 *
 * ALL prices live in item-value.price-book.ts — the single source of
 * truth (curated used-market reference values, November 2026, reviewed
 * periodically). This module is only the detection logic; a price
 * refresh edits the price book, never this file.
 *
 * Pure and deterministic: same input, same output, no I/O. The rule that
 * fired is returned for tests and debuggability.
 *
 * Detection pipeline (order matters):
 *  1. Accessory sub-bands — titles name the item, so a charger / cable /
 *     USB stick / case is priced as itself even when the reporter filed
 *     it under Laptops or Electronics. (Descriptions are NOT scanned:
 *     they mention other items' accessories.)
 *  2. Electronics sub-bands — tablets and smartwatches filed under the
 *     generic Electronics category.
 *  3. Model signals — Phones category ONLY, so an «iPhone 13 case» is
 *     never priced as an iPhone 13. Regexes run over the normalized
 *     text (Arabic-Indic digits already unified by normalizeText) and
 *     the number must attach to the brand token.
 *  4. Brand tier — premium / mid / budget band of the category.
 *  5. Category default — mid band (Phones lean budget: no brand and no
 *     model usually means a budget Android on a campus).
 */
import type { LostFoundCategory } from '../../../config/constants';
import { canonicalBrandGroup, normalizeText } from '../matches/matching-text';
import {
  ACCESSORY_PATTERNS,
  BRAND_ALIASES,
  CATEGORY_BANDS,
  GALAXY_A_FIRST_DIGIT_VALUES,
  GALAXY_S_MODEL_VALUES,
  IPHONE_MODEL_VALUES,
  PHONE_NO_BRAND_DEFAULT_EGP,
  PREMIUM_LAPTOP_LINE_TOKENS,
  SAMSUNG_NO_MODEL_EGP,
  SUBCATEGORY_VALUES,
  TIER_BY_BRAND_GROUP,
  VALUE_MAX_EGP,
  VALUE_MIN_EGP,
  type BrandTier,
} from './item-value.price-book';

export type EstimateRule =
  | 'accessory-cap'
  | 'subcategory'
  | 'model'
  | 'brand-tier'
  | 'category-default';

export interface ItemValueInput {
  category: LostFoundCategory;
  brand?: string | null;
  title: string;
  description: string;
}

export interface ItemValueEstimate {
  valueEGP: number;
  rule: EstimateRule;
  brandGroup: string | null;
  tier: BrandTier | null;
}

const KNOWN_BRAND_GROUPS = new Set(Object.keys(TIER_BY_BRAND_GROUP));

function textTokens(normalized: string): string[] {
  return normalized
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ''))
    .filter(Boolean);
}

function aliasGroupIn(normalized: string): string | null {
  if (normalized.includes('ماك بوك')) return 'apple';
  for (const token of textTokens(normalized)) {
    const group = BRAND_ALIASES.get(token);
    if (group) return group;
  }
  return null;
}

/**
 * Brand group for one text stage, or null when nothing known is found.
 * The price-book alias table runs first; the matching engine's canonical
 * groups second (unknown free-text results are ignored).
 */
function detectBrandGroupIn(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const alias = aliasGroupIn(normalizeText(text));
  if (alias) return alias;
  const canonical = canonicalBrandGroup(text);
  return canonical && KNOWN_BRAND_GROUPS.has(canonical) ? canonical : null;
}

/** Precedence: brand field → title → description, first hit per stage. */
function detectBrandGroup(input: ItemValueInput): string | null {
  return (
    detectBrandGroupIn(input.brand) ??
    detectBrandGroupIn(input.title) ??
    detectBrandGroupIn(input.description)
  );
}

function accessoryValue(normalizedTitle: string): number | null {
  const tokens = new Set(textTokens(normalizedTitle));
  for (const pattern of ACCESSORY_PATTERNS) {
    if (pattern.tokens.some((token) => tokens.has(token))) {
      return pattern.valueEGP;
    }
    if (pattern.phrases.some((phrase) => normalizedTitle.includes(phrase))) {
      return pattern.valueEGP;
    }
  }
  return null;
}

function subcategoryValue(
  input: ItemValueInput,
  normalizedTitle: string,
): number | null {
  if (input.category !== 'Electronics' && input.category !== 'Other') {
    return null;
  }
  const tokens = new Set(textTokens(normalizedTitle));
  if (
    tokens.has('tablet') ||
    tokens.has('تابلت') ||
    tokens.has('ipad') ||
    tokens.has('ايباد')
  ) {
    return SUBCATEGORY_VALUES.tabletEGP;
  }
  if (
    tokens.has('smartwatch') ||
    normalizedTitle.includes('smart watch') ||
    normalizedTitle.includes('ساعه ذكيه') ||
    normalizedTitle.includes('apple watch')
  ) {
    return SUBCATEGORY_VALUES.smartwatchEGP;
  }
  return null;
}

interface ModelSignal {
  valueEGP: number;
  brandGroup: string;
  tier: BrandTier;
}

function modelSignal(normalizedText: string): ModelSignal | null {
  const iphone = /(?:iphone|ايفون)\s*-?\s*(\d{1,2})/.exec(normalizedText);
  if (iphone) {
    const value = IPHONE_MODEL_VALUES[Number(iphone[1])];
    if (value) return { valueEGP: value, brandGroup: 'apple', tier: 'premium' };
  }

  const galaxyS =
    /(?:galaxy|جالاكسي|جلاكسي)\s*-?\s*s\s*-?\s*(\d{1,2})/.exec(normalizedText);
  if (galaxyS) {
    const value = GALAXY_S_MODEL_VALUES[Number(galaxyS[1])];
    if (value) {
      return { valueEGP: value, brandGroup: 'samsung', tier: 'premium' };
    }
  }

  const galaxyA =
    /(?:galaxy|جالاكسي|جلاكسي)\s*-?\s*a\s*-?\s*(\d{1,2})/.exec(normalizedText);
  if (galaxyA) {
    const digits = galaxyA[1]!;
    if (digits.length === 2) {
      const value = GALAXY_A_FIRST_DIGIT_VALUES[digits[0]!];
      if (value) {
        return { valueEGP: value, brandGroup: 'samsung', tier: 'mid' };
      }
    }
  }

  return null;
}

function clampAndRound(value: number): number {
  const rounded = Math.round(value / 10) * 10;
  return Math.min(VALUE_MAX_EGP, Math.max(VALUE_MIN_EGP, rounded));
}

export function estimateItemValue(input: ItemValueInput): ItemValueEstimate {
  const normalizedTitle = normalizeText(input.title);
  const brandGroup = detectBrandGroup(input);
  const finish = (
    valueEGP: number,
    rule: EstimateRule,
    tier: BrandTier | null,
  ): ItemValueEstimate => ({
    valueEGP: clampAndRound(valueEGP),
    rule,
    brandGroup,
    tier,
  });

  const accessory = accessoryValue(normalizedTitle);
  if (accessory !== null) return finish(accessory, 'accessory-cap', null);

  const subcategory = subcategoryValue(input, normalizedTitle);
  if (subcategory !== null) return finish(subcategory, 'subcategory', null);

  if (input.category === 'Phones') {
    const combined = normalizeText(
      `${input.brand ?? ''} ${input.title} ${input.description}`,
    );
    const signal = modelSignal(combined);
    if (signal) {
      return {
        valueEGP: clampAndRound(signal.valueEGP),
        rule: 'model',
        brandGroup: signal.brandGroup,
        tier: signal.tier,
      };
    }
  }

  if (brandGroup) {
    const band = CATEGORY_BANDS[input.category];
    let tier = TIER_BY_BRAND_GROUP[brandGroup] ?? 'mid';

    if (input.category === 'Phones' && brandGroup === 'samsung') {
      return finish(SAMSUNG_NO_MODEL_EGP, 'brand-tier', 'mid');
    }

    if (
      input.category === 'Laptops' &&
      (brandGroup === 'dell' || brandGroup === 'hp' || brandGroup === 'lenovo')
    ) {
      const combined = normalizeText(
        `${input.brand ?? ''} ${input.title} ${input.description}`,
      );
      const hasPremiumLine = textTokens(combined).some((token) =>
        PREMIUM_LAPTOP_LINE_TOKENS.has(token),
      );
      tier = hasPremiumLine ? 'premium' : 'mid';
    }

    return finish(band[tier], 'brand-tier', tier);
  }

  if (input.category === 'Phones') {
    return finish(PHONE_NO_BRAND_DEFAULT_EGP, 'category-default', null);
  }

  return finish(CATEGORY_BANDS[input.category].mid, 'category-default', null);
}
