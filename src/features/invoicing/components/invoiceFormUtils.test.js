import { describe, it, expect } from 'vitest';
import {
  calculateTotals,
  getRowAmount,
  emptyToUndefined,
  isHourRow,
  addDaysToDate,
} from './invoiceFormUtils';

describe('calculateTotals', () => {
  it('sums line amounts and VAT', () => {
    const items = [
      { quantity: 2, price: 100, discount: 0, vatRate: 25 },
      { quantity: 1, price: 50, discount: 0, vatRate: 25 },
    ];
    expect(calculateTotals(items)).toEqual({ subtotal: 250, vat: 62.5, total: 312.5 });
  });

  it('applies per-row discount to the subtotal', () => {
    const items = [{ quantity: 2, price: 100, discount: 10, vatRate: 25 }];
    // 2 * 100 * 0.9 = 180; VAT 25% = 45
    expect(calculateTotals(items)).toEqual({ subtotal: 180, vat: 45, total: 225 });
  });

  it('drops VAT under reverse charge', () => {
    const items = [{ quantity: 1, price: 100, discount: 0, vatRate: 25 }];
    expect(calculateTotals(items, true)).toEqual({ subtotal: 100, vat: 0, total: 100 });
  });

  it('is empty-safe', () => {
    expect(calculateTotals()).toEqual({ subtotal: 0, vat: 0, total: 0 });
  });
});

describe('getRowAmount', () => {
  it('multiplies qty × price × (1 - discount)', () => {
    expect(getRowAmount({ quantity: 3, price: 100, discount: 10 })).toBe(270);
  });
  it('defaults missing fields to 0', () => {
    expect(getRowAmount({})).toBe(0);
    expect(getRowAmount(null)).toBe(0);
  });
});

describe('emptyToUndefined', () => {
  it('trims blanks to undefined', () => {
    expect(emptyToUndefined('   ')).toBeUndefined();
    expect(emptyToUndefined('')).toBeUndefined();
  });
  it('keeps real strings (trimmed)', () => {
    expect(emptyToUndefined('  hi ')).toBe('hi');
  });
  it('passes non-strings through unchanged', () => {
    expect(emptyToUndefined(5)).toBe(5);
    expect(emptyToUndefined(null)).toBeNull();
  });
});

describe('isHourRow', () => {
  it('recognises labour units case-insensitively', () => {
    expect(isHourRow({ unit: 'tim' })).toBe(true);
    expect(isHourRow({ unit: 'H' })).toBe(true);
    expect(isHourRow({ unit: 'hours' })).toBe(true);
  });
  it('rejects non-hour units', () => {
    expect(isHourRow({ unit: 'st' })).toBe(false);
    expect(isHourRow({})).toBe(false);
  });
});

describe('addDaysToDate', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(addDaysToDate(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('is ordered — +10 days is after today', () => {
    expect(addDaysToDate(10) > addDaysToDate(0)).toBe(true);
  });
});
