/**
 * Pure presentation helpers for the staff Statistics page (spec 011),
 * kept separate from the components so the formatting and visibility
 * rules are unit-testable without rendering.
 */

const percentFormatter = new Intl.NumberFormat('ar-EG-u-nu-latn', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Wire fraction (0–1, server-rounded to 4dp) → display percent with one
 * decimal («66.7%»). A null rate means "no lost reports yet" — the UI
 * shows a dash, never a misleading 0%.
 */
export function formatReturnRate(rate: number | null): string {
  if (rate === null) return '—';
  return percentFormatter.format(rate);
}

/** The dashboard stale alert exists only when there is something to act on. */
export function shouldShowStaleAlert(staleCount: number): boolean {
  return staleCount > 0;
}

/** How many stale items the capped payload list does not show. */
export function staleRemainder(staleCount: number, shown: number): number {
  return Math.max(0, staleCount - shown);
}
