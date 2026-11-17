import { describe, expect, it } from 'vitest';
import {
  formatReturnRate,
  shouldShowStaleAlert,
  staleRemainder,
} from '../src/features/dashboard/statisticsModel';

describe('formatReturnRate (spec 011)', () => {
  // The ar-EG percent formatter wraps the sign in U+200E bidi marks;
  // compare the visible text.
  const plain = (value: string) => value.replace(/[\u200e\u200f]/g, '');

  it('renders the wire fraction as a one-decimal percent', () => {
    expect(plain(formatReturnRate(0.6667))).toBe('66.7%');
    expect(plain(formatReturnRate(1))).toBe('100.0%');
    expect(plain(formatReturnRate(0))).toBe('0.0%');
  });

  it('renders a null rate (no lost reports) as a dash, never 0%', () => {
    expect(formatReturnRate(null)).toBe('—');
  });
});

describe('shouldShowStaleAlert (spec 011)', () => {
  it('shows the dashboard alert only when something is stale', () => {
    expect(shouldShowStaleAlert(0)).toBe(false);
    expect(shouldShowStaleAlert(1)).toBe(true);
    expect(shouldShowStaleAlert(27)).toBe(true);
  });
});

describe('staleRemainder (spec 011)', () => {
  it('reports how many stale items the capped list hides', () => {
    expect(staleRemainder(27, 20)).toBe(7);
    expect(staleRemainder(20, 20)).toBe(0);
    expect(staleRemainder(3, 20)).toBe(0);
    expect(staleRemainder(0, 0)).toBe(0);
  });
});
