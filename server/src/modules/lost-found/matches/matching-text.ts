/**
 * Text intelligence for matching v2 (specs/002-hard-matching).
 *
 * Real students describe the same item in different words, dialects and
 * scripts: شنطة vs حقيبة, كحلي vs أزرق غامق, ٣٢ vs 32GB, سوني vs Sony, plus
 * typos. This module canonicalizes both sides into comparable tokens so the
 * scoring service can stay a simple weighted sum. Pure and deterministic.
 */

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeText(value: string): string {
  let text = value.normalize('NFKC').toLowerCase();
  text = text.replace(/[٠-٩]/g, (ch) => String(ARABIC_INDIC_DIGITS.indexOf(ch)));
  text = text.replace(/[۰-۹]/g, (ch) => String(EASTERN_ARABIC_DIGITS.indexOf(ch)));
  text = text.replace(/[ً-ٰٟ]/g, ''); // diacritics
  text = text.replace(/ـ/g, ''); // tatweel
  text = text.replace(/[أإآٱ]/g, 'ا');
  text = text.replace(/ة/g, 'ه');
  text = text.replace(/ى/g, 'ي');
  text = text.replace(/ؤ/g, 'و');
  text = text.replace(/ئ/g, 'ي');
  return text.replace(/\s+/g, ' ').trim();
}

function stripPrefixes(token: string): string {
  let result = token;
  for (let pass = 0; pass < 2; pass += 1) {
    if (result.startsWith('ال') && result.length > 4) {
      result = result.slice(2);
    } else if (/^[وبل]/.test(result) && result.length >= 6) {
      result = result.slice(1);
    } else {
      break;
    }
  }
  return result;
}

function stripSuffixes(token: string): string {
  if (token.endsWith('تي') && token.length >= 5) {
    return `${token.slice(0, -2)}ه`; // possessive: بطاقتي → بطاقه
  }
  let result = token;
  if (result.endsWith('ي') && result.length >= 6) result = result.slice(0, -1);
  if (result.endsWith('ات') && result.length > 5) result = result.slice(0, -2);
  if (/(ون|ين)$/.test(result) && result.length > 5) result = result.slice(0, -2);
  if (result.endsWith('ان') && result.length > 6) result = result.slice(0, -2);
  if (result.endsWith('s') && !result.endsWith('ss') && result.length > 4) {
    result = result.slice(0, -1); // Latin plurals: structures → structure
  }
  return result;
}

/**
 * One token's canonical form: prefixes/suffixes stripped so that المفاتيح,
 * مفاتيحي and مفاتيح compare equal. Digit-bearing tokens are identifiers
 * and are never stemmed.
 */
export function canonicalToken(rawToken: string): string {
  if (/\d/.test(rawToken)) return rawToken;
  return stripSuffixes(stripPrefixes(rawToken));
}

/** Synonym groups: canonical target → spelling/dialect/language variants. */
const TOKEN_SYNONYM_GROUPS: Record<string, string[]> = {
  backpack: ['شنطة', 'حقيبة', 'bag', 'backpack'],
  phone: ['موبايل', 'هاتف', 'جوال', 'تليفون', 'phone', 'mobile'],
  wallet: ['محفظة', 'بوك', 'wallet'],
  glasses: ['نظارة', 'نضارة', 'glasses'],
  headphones: ['سماعات', 'سماعة', 'هيدفون', 'headphones', 'earbuds'],
  bottle: ['زجاجة', 'قارورة', 'bottle', 'flask'],
  umbrella: ['مظلة', 'شمسية', 'umbrella'],
  usb: ['فلاشة', 'usb'],
  idcard: ['كارنيه'],
  hoodie: ['هودي', 'hoodie', 'sweatshirt'],
  book: ['كتاب', 'textbook', 'book'],
  calculator: ['حاسبة', 'calculator'],
  keys: ['مفاتيح', 'مفتاح', 'keys'],
  charger: ['شاحن', 'charger'],
  laptop: ['لابتوب', 'laptop'],
  data: ['داتا', 'data'],
  structure: ['ستراكشر'],
  case: ['جراب', 'حافظة', 'case'],
  water: ['ميه', 'مياه', 'ماء', 'water'],
  back: ['ضهر', 'ظهر'],
  // Colors (dialect spellings included) so كحلي/زرقا/silver compare equal.
  black: ['اسود', 'سودا', 'سوداء', 'black'],
  white: ['ابيض', 'بيضا', 'white'],
  silver: ['فضي', 'سيلفر', 'silver'],
  gold: ['ذهبي', 'دهبي', 'جولد', 'gold'],
  grey: ['رمادي', 'رصاصي', 'grey', 'gray'],
  brown: ['بني', 'brown'],
  red: ['احمر', 'حمرا', 'حمراء', 'red'],
  green: ['اخضر', 'خضرا', 'green'],
  blue: ['ازرق', 'زرقا', 'زرقاء', 'blue'],
  navy: ['كحلي', 'navy'],
  yellow: ['اصفر', 'صفرا', 'yellow'],
  pink: ['وردي', 'بينك', 'pink'],
  purple: ['بنفسجي', 'purple'],
  orange: ['برتقالي', 'orange'],
  beige: ['بيج', 'beige'],
  // Brand transliterations found inside free text.
  sony: ['سوني', 'sony'],
  casio: ['كاسيو', 'casio'],
  samsung: ['سامسونج', 'samsung'],
  apple: ['ابل', 'apple'],
  lenovo: ['لينوفو', 'lenovo'],
  nike: ['نايك', 'nike'],
  adidas: ['اديداس', 'adidas'],
  xiaomi: ['شاومي', 'xiaomi'],
  huawei: ['هواوي', 'huawei'],
  dell: ['ديل', 'dell'],
  anker: ['انكر', 'anker'],
  kingston: ['كينجستون', 'kingston'],
  thermos: ['ثيرموس', 'thermos'],
  iphone: ['ايفون', 'iphone'],
  galaxy: ['جالاكسي', 'galaxy'],
};

const TOKEN_SYNONYMS = new Map<string, string>();
for (const [target, variants] of Object.entries(TOKEN_SYNONYM_GROUPS)) {
  for (const variant of variants) {
    TOKEN_SYNONYMS.set(canonicalToken(normalizeText(variant)), target);
  }
  TOKEN_SYNONYMS.set(canonicalToken(normalizeText(target)), target);
}

/** Multi-word phrases replaced in canonical token space. */
const TOKEN_PHRASES: Array<[string, string]> = [
  ['حقيبه ظهر', 'backpack'],
  ['سويت شيرت', 'hoodie'],
  ['بطاقه هويه', 'idcard'],
  ['بطاقه جامعيه', 'idcard'],
  ['ذاكره فلاش', 'usb'],
  ['flash drive', 'usb'],
  ['id card', 'idcard'],
  ['north face', 'northface'],
  ['اله حاسبه', 'calculator'],
  ['لاب توب', 'laptop'],
];

function applyPhrases(tokens: string[]): string[] {
  let joined = ` ${tokens.join(' ')} `;
  for (const [phrase, target] of TOKEN_PHRASES) {
    joined = joined.split(` ${phrase} `).join(` ${target} `);
  }
  return joined.split(/\s+/).filter(Boolean);
}

function rawTokens(value: string): string[] {
  return normalizeText(value)
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ''))
    .filter(Boolean);
}

/** Canonical tokens for a text, in order, with duplicates kept. */
export function canonicalTokens(value: string): string[] {
  const canonical = rawTokens(value).map((token) => {
    const stemmed = canonicalToken(token);
    return TOKEN_SYNONYMS.get(stemmed) ?? stemmed;
  });
  return applyPhrases(canonical);
}

/** Canonical token set with stop words removed (checked pre- and post-stem). */
export function canonicalTokenSet(
  value: string,
  stopWords: Set<string>,
): Set<string> {
  const result = new Set<string>();
  const raws = rawTokens(value);
  const canonical = canonicalTokens(value);
  canonical.forEach((token, index) => {
    if (stopWords.has(token) || stopWords.has(raws[index] ?? '')) return;
    result.add(token);
  });
  return result;
}

function levenshtein(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0]!;
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j]!;
      previous[j] =
        a[i - 1] === b[j - 1]
          ? diagonal
          : 1 + Math.min(diagonal, above, previous[j - 1]!);
      diagonal = above;
    }
  }
  return previous[b.length]!;
}

export function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - levenshtein(a, b) / maxLength;
}

/** Typo tolerance: near-identical spellings of longer tokens count as equal. */
export function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (/\d/.test(a) || /\d/.test(b)) return false; // identifiers never fuzzy
  if (Math.min(a.length, b.length) < 4) return false;
  return tokenSimilarity(a, b) >= 0.8;
}

/**
 * Weighted Dice coefficient with greedy fuzzy pairing: each token is used
 * at most once, best similarities first. Weights let identifier tokens in a
 * title count triple (a shared model number is strong evidence).
 */
export function fuzzyDice(
  left: Map<string, number>,
  right: Map<string, number>,
): number {
  const leftTotal = [...left.values()].reduce((sum, w) => sum + w, 0);
  const rightTotal = [...right.values()].reduce((sum, w) => sum + w, 0);
  if (leftTotal === 0 || rightTotal === 0) return 0;

  const candidates: Array<{ l: string; r: string; sim: number }> = [];
  for (const l of left.keys()) {
    for (const r of right.keys()) {
      if (tokensMatch(l, r)) candidates.push({ l, r, sim: tokenSimilarity(l, r) });
    }
  }
  candidates.sort((x, y) => y.sim - x.sim);

  const usedLeft = new Set<string>();
  const usedRight = new Set<string>();
  let shared = 0;
  for (const { l, r } of candidates) {
    if (usedLeft.has(l) || usedRight.has(r)) continue;
    usedLeft.add(l);
    usedRight.add(r);
    shared += Math.min(left.get(l)!, right.get(r)!);
  }
  return Math.min(1, (2 * shared) / (leftTotal + rightTotal));
}

export function unweighted(tokens: Set<string>): Map<string, number> {
  return new Map([...tokens].map((token) => [token, 1]));
}

const IDENTIFIER_UNITS = new Set([
  'gb', 'mb', 'tb', 'w', 'mah', 'ml', 'l', 'cm', 'mm', 'inch', 'in',
]);

/**
 * Comparison key for an identifier: unit-only suffixes collapse to the
 * digits (32gb ≡ 32), while model letters stay (fx991arx, whch720n).
 */
export function identifierKey(identifier: string): string {
  const letters = identifier.replace(/\d/g, '');
  if (letters === '' || IDENTIFIER_UNITS.has(letters)) {
    return identifier.replace(/\D/g, '');
  }
  return identifier;
}

/** Title tokens weighted: identifiers ×3, everything else ×1. */
export function weightedTitleTokens(
  value: string,
  stopWords: Set<string>,
): Map<string, number> {
  const weighted = new Map<string, number>();
  for (const token of canonicalTokenSet(value, stopWords)) {
    if (/\d/.test(token)) {
      weighted.set(identifierKey(token.replace(/-/g, '')), 3);
    } else {
      weighted.set(token, 1);
    }
  }
  return weighted;
}

/**
 * Model/identifier tokens: anything carrying a digit (13, 32gb, 65w,
 * fx-991arx). Extracted before tokenization would lose the hyphens.
 * Canonical form drops hyphens: fx-991arx → fx991arx.
 */
export function extractIdentifiers(value: string): Set<string> {
  const identifiers = new Set<string>();
  for (const token of rawTokens(value)) {
    if (/\d/.test(token)) identifiers.add(token.replace(/-/g, ''));
  }
  return identifiers;
}

function identifierDigits(identifier: string): string {
  return identifier.replace(/\D/g, '');
}

function identifierLetters(identifier: string): string {
  return identifier.replace(/\d/g, '');
}

function identifiersMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const digitsA = identifierDigits(a);
  const digitsB = identifierDigits(b);
  if (!digitsA || digitsA !== digitsB) return false;
  const lettersA = identifierLetters(a);
  const lettersB = identifierLetters(b);
  return (
    lettersA === lettersB ||
    lettersA === '' ||
    lettersB === '' ||
    IDENTIFIER_UNITS.has(lettersA) ||
    IDENTIFIER_UNITS.has(lettersB)
  );
}

export type IdentifierRelation = 'match' | 'conflict' | 'none';

/**
 * Both sides naming identifiers that never agree (13 vs 12, fx991 vs
 * fx570, 32gb vs 64gb) means two different items, however similar the
 * prose around them is.
 */
export function identifierRelation(
  lost: Set<string>,
  found: Set<string>,
): IdentifierRelation {
  if (lost.size === 0 || found.size === 0) return 'none';
  for (const l of lost) {
    for (const f of found) {
      if (identifiersMatch(l, f)) return 'match';
    }
  }
  return 'conflict';
}

const COLOR_GROUPS = new Map<string, string>();
for (const [target, variants] of Object.entries(TOKEN_SYNONYM_GROUPS)) {
  if (
    ['black', 'white', 'silver', 'gold', 'grey', 'brown', 'red', 'green',
     'blue', 'navy', 'yellow', 'pink', 'purple', 'orange', 'beige'].includes(target)
  ) {
    for (const variant of variants) {
      COLOR_GROUPS.set(canonicalToken(normalizeText(variant)), target);
    }
    COLOR_GROUPS.set(target, target);
  }
}

/**
 * Canonical color group for a color field: كحلي, navy and أزرق غامق are one
 * group; unknown colors form their own group from their normalized text.
 */
export function canonicalColorGroup(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const tokens = canonicalTokens(value);
  if (tokens.length === 0) return null;
  if (tokens.includes('navy')) return 'navy';
  const hasDarkShade = tokens.some((t) => t === 'غامق' || t === 'داكن' || t === 'dark');
  if (hasDarkShade && tokens.includes('blue')) return 'navy';
  for (const token of tokens) {
    const group = COLOR_GROUPS.get(token);
    if (group) return group;
  }
  return tokens.join(' ');
}

const BRAND_PHRASES: Array<[string, string]> = [
  ['north face', 'northface'],
  ['نورث فيس', 'northface'],
  ['اتش بي', 'hp'],
  ['ال جي', 'lg'],
];

const BRAND_TOKENS = new Map<string, string>([
  ['iphone', 'apple'],
  ['ايفون', 'apple'],
  ['galaxy', 'samsung'],
  ['جالاكسي', 'samsung'],
]);

const KNOWN_BRAND_GROUPS = new Set([
  'sony', 'casio', 'samsung', 'apple', 'lenovo', 'nike', 'adidas',
  'xiaomi', 'huawei', 'dell', 'anker', 'kingston', 'thermos',
]);

/** Canonical brand group for a brand field, incl. product lines (iPhone→Apple). */
export function canonicalBrandGroup(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const normalized = normalizeText(value);
  for (const [phrase, group] of BRAND_PHRASES) {
    if (normalized.includes(normalizeText(phrase))) return group;
  }
  const tokens = canonicalTokens(value);
  for (const token of tokens) {
    const productLine = BRAND_TOKENS.get(token);
    if (productLine) return productLine;
    const synonym = TOKEN_SYNONYMS.get(token);
    if (synonym && KNOWN_BRAND_GROUPS.has(synonym)) return synonym;
    if (KNOWN_BRAND_GROUPS.has(token)) return token;
  }
  return tokens.join(' ') || null;
}
