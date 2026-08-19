import { describe, it, expect } from 'vitest';
import { formatAmount, formatMoney, formatSek } from '@/src/utils/formatCurrency';

// Intl uses a non-breaking space as the thousands separator; normalise any
// whitespace to a plain space so assertions don't depend on the codepoint.
const norm = (s) => s.replace(/\s/g, ' ');

describe('formatCurrency', () => {
  it('formats plain amounts with Swedish grouping', () => {
    expect(norm(formatAmount(2450000))).toBe('2 450 000,00');
    expect(norm(formatAmount(1234.5, { decimals: false }))).toBe('1 235');
  });

  it('formatSek is formatMoney(value, SEK)', () => {
    expect(formatSek(2450000)).toBe(formatMoney(2450000, 'SEK'));
    expect(formatSek(999, { decimals: false })).toBe(formatMoney(999, 'SEK', { decimals: false }));
    expect(norm(formatSek(2450000))).toBe('2 450 000,00 SEK');
  });

  it('appends the currency suffix', () => {
    expect(norm(formatMoney(2450000, 'NOK'))).toBe('2 450 000,00 NOK');
    expect(norm(formatMoney(999, 'NOK', { decimals: false }))).toBe('999 NOK');
  });

  it('falls back to SEK for unknown currencies and handles nullish values', () => {
    expect(norm(formatMoney(100, 'ZZZ'))).toBe('100,00 SEK');
    expect(norm(formatMoney(null, 'NOK'))).toBe('0,00 NOK');
  });
});
