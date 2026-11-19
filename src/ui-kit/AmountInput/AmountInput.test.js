import { describe, expect, it } from 'vitest';
import { formatAmount, parseAmount } from './AmountInput';

describe('AmountInput (19.11: space after thousands)', () => {
  it('groups the whole-number part only', () => {
    expect(formatAmount('71400.00')).toBe('71 400.00');
    expect(formatAmount('2000000.00')).toBe('2 000 000.00');
    expect(formatAmount('2184.05')).toBe('2 184.05');
    expect(formatAmount('436.81')).toBe('436.81');
    expect(formatAmount('1234,5678')).toBe('1 234,5678');
    expect(formatAmount('-12500')).toBe('-12 500');
    expect(formatAmount('')).toBe('');
  });
  it('reads it back without spaces', () => {
    expect(parseAmount('71 400.00')).toBe('71400.00');
  });
});
