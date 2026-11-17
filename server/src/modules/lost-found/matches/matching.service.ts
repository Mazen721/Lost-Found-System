import type {
  LostFoundCategory,
  MatchLevel,
  ReportType,
} from '../../../config/constants';
import {
  KEYWORD_STOP_WORDS,
  MATCHING_CAPS,
  MATCHING_THRESHOLDS,
  MATCHING_WEIGHTS,
} from '../../../config/matching.config';
import type { MatchBreakdown } from './itemMatch.model';
import {
  canonicalBrandGroup,
  canonicalColorGroup,
  canonicalTokenSet,
  extractIdentifiers,
  fuzzyDice,
  identifierRelation,
  normalizeText,
  unweighted,
  weightedTitleTokens,
} from './matching-text';

const DAY_MS = 24 * 60 * 60 * 1000;
const KEYWORD_SCALE = 0.5;
const IDENTIFIER_TITLE_BONUS = 0.15;
const STOP_WORDS = new Set<string>(KEYWORD_STOP_WORDS);

export type MatchWeightKey = keyof MatchBreakdown;

export interface MatchingConfig {
  weights: Record<MatchWeightKey, number>;
  thresholds: { STRONG: number; POSSIBLE: number };
}

export interface MatchableLocation {
  id: string;
  buildingName?: string;
  floor?: string;
}

export interface MatchableItem {
  id: string;
  reportType: ReportType;
  category: LostFoundCategory;
  location: MatchableLocation | null;
  occurrenceDate: Date;
  color?: string;
  brand?: string;
  itemTitle: string;
  description: string;
  /** Arabic fields: the app is Arabic-only, so Arabic text drives scoring too. */
  itemTitleAr?: string;
  descriptionAr?: string;
}

export interface MatchScore {
  score: number;
  /** Null when the pair scores below the POSSIBLE threshold. */
  level: MatchLevel | null;
  breakdown: MatchBreakdown;
}

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  weights: MATCHING_WEIGHTS,
  thresholds: MATCHING_THRESHOLDS,
};

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function categorySubScore(
  lost: MatchableItem,
  found: MatchableItem,
): number | null {
  if (lost.category === found.category) {
    return 1;
  }

  if (lost.category === 'Other' || found.category === 'Other') {
    return 0.4;
  }

  // Incompatible categories are a hard filter.
  return null;
}

function locationSubScore(
  lost: MatchableItem,
  found: MatchableItem,
): number {
  if (!lost.location || !found.location) {
    return 0;
  }

  if (lost.location.id === found.location.id) {
    return 1;
  }

  const lostBuilding = lost.location.buildingName
    ? normalizeText(lost.location.buildingName)
    : undefined;
  const foundBuilding = found.location.buildingName
    ? normalizeText(found.location.buildingName)
    : undefined;

  if (!lostBuilding || !foundBuilding || lostBuilding !== foundBuilding) {
    return 0;
  }

  const lostFloor = lost.location.floor
    ? normalizeText(lost.location.floor)
    : undefined;
  const foundFloor = found.location.floor
    ? normalizeText(found.location.floor)
    : undefined;

  return lostFloor && foundFloor && lostFloor === foundFloor ? 0.8 : 0.6;
}

function dateSubScore(lost: MatchableItem, found: MatchableItem): number {
  const gapDays =
    Math.abs(found.occurrenceDate.getTime() - lost.occurrenceDate.getTime()) /
    DAY_MS;

  if (gapDays <= 1) return 1;
  if (gapDays <= 3) return 0.8;
  if (gapDays <= 7) return 0.5;
  if (gapDays <= 14) return 0.2;
  return 0;
}

interface AttributeComparison {
  score: number;
  comparable: boolean;
  conflict: boolean;
}

function compareAttribute(
  lostGroup: string | null,
  foundGroup: string | null,
): AttributeComparison {
  if (!lostGroup || !foundGroup) {
    return { score: 0, comparable: false, conflict: false };
  }
  const equal = lostGroup === foundGroup;
  return { score: equal ? 1 : 0, comparable: true, conflict: !equal };
}

function titleText(item: MatchableItem): string {
  return `${item.itemTitle} ${item.itemTitleAr ?? ''}`;
}

function descriptionText(item: MatchableItem): string {
  return `${item.description} ${item.descriptionAr ?? ''}`;
}

/**
 * Title agreement with identifier evidence folded in: identifier tokens
 * weigh ×3 inside the Dice, and identifiers that agree across the full
 * text (title + description) add a bonus — a shared model number is the
 * strongest single signal two reports describe one item.
 */
function titleSubScore(
  lost: MatchableItem,
  found: MatchableItem,
  identifiersAgree: boolean,
): number {
  const dice = fuzzyDice(
    weightedTitleTokens(titleText(lost), STOP_WORDS),
    weightedTitleTokens(titleText(found), STOP_WORDS),
  );
  return identifiersAgree ? Math.min(1, dice + IDENTIFIER_TITLE_BONUS) : dice;
}

function keywordSubScore(lost: MatchableItem, found: MatchableItem): number {
  const dice = fuzzyDice(
    unweighted(canonicalTokenSet(descriptionText(lost), STOP_WORDS)),
    unweighted(canonicalTokenSet(descriptionText(found), STOP_WORDS)),
  );
  return Math.min(1, dice / KEYWORD_SCALE);
}

/**
 * Deterministic Lost & Found pair scoring, v2 (specs/002-hard-matching).
 * Pure: no database or network access. Returns null when a hard filter
 * skips the pair, otherwise the score, level (null below POSSIBLE) and
 * sub-scores. Contradictory evidence caps the score after weighting:
 * conflicting model identifiers cap at 59 (different items), conflicting
 * color or brand caps at 69 (never STRONG).
 */
export function scorePair(
  lost: MatchableItem,
  found: MatchableItem,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
): MatchScore | null {
  if (lost.reportType !== 'LOST' || found.reportType !== 'FOUND') {
    return null;
  }

  const category = categorySubScore(lost, found);
  if (category === null) {
    return null;
  }

  const foundBeforeLostMs =
    lost.occurrenceDate.getTime() - found.occurrenceDate.getTime();
  if (foundBeforeLostMs > DAY_MS) {
    return null;
  }

  const identifiers = identifierRelation(
    extractIdentifiers(`${titleText(lost)} ${descriptionText(lost)}`),
    extractIdentifiers(`${titleText(found)} ${descriptionText(found)}`),
  );

  const color = compareAttribute(
    canonicalColorGroup(lost.color),
    canonicalColorGroup(found.color),
  );
  const brand = compareAttribute(
    canonicalBrandGroup(lost.brand),
    canonicalBrandGroup(found.brand),
  );

  const breakdown: MatchBreakdown = {
    category,
    title: titleSubScore(lost, found, identifiers === 'match'),
    location: locationSubScore(lost, found),
    date: dateSubScore(lost, found),
    color: color.score,
    brand: brand.score,
    keywords: keywordSubScore(lost, found),
  };

  let weightedTotal = 0;
  let comparableWeight = 0;

  const add = (key: MatchWeightKey, subScore: number): void => {
    const weight = config.weights[key];
    weightedTotal += weight * subScore;
    comparableWeight += weight;
  };

  add('category', breakdown.category);
  add('title', breakdown.title);
  add('location', breakdown.location);
  add('date', breakdown.date);

  if (color.comparable) add('color', breakdown.color);
  if (brand.comparable) add('brand', breakdown.brand);

  add('keywords', breakdown.keywords);

  let score =
    comparableWeight === 0 ? 0 : round((weightedTotal / comparableWeight) * 100, 2);

  if (identifiers === 'conflict') {
    score = Math.min(score, MATCHING_CAPS.IDENTIFIER_CONFLICT);
  } else if (color.conflict || brand.conflict) {
    score = Math.min(score, MATCHING_CAPS.ATTRIBUTE_CONFLICT);
  }

  const level: MatchLevel | null =
    score >= config.thresholds.STRONG
      ? 'STRONG'
      : score >= config.thresholds.POSSIBLE
        ? 'POSSIBLE'
        : null;

  return { score, level, breakdown };
}

/**
 * Matches are refreshed only while they are still suggestions. Confirmed and
 * dismissed decisions are final and must never be revived by recalculation.
 */
export function canRefreshMatch(status: string): boolean {
  return status === 'SUGGESTED';
}
