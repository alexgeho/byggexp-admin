import { describe, it, expect } from 'vitest';
import {
  amountIsGross, lineAmount, lineNet, lineVat, cellValue, tableTotals, sideTotals,
  nearestVatRate, isNumericColumn, dateLabel, migrateDateLabels,
} from './kalkylModel';

// Minimal table with a single Amount column and one row.
const amountTable = (amount, extra = {}) => ({
  vatRate: 25,
  columns: [{ id: 'a', type: 'amount' }],
  rows: [{ id: 'r', cells: { a: amount } }],
  ...extra,
});

describe('VAT math (gross by default)', () => {
  it('backs VAT out of a gross Amount', () => {
    const t = amountTable(500);
    expect(lineAmount(t, t.rows[0])).toBe(500);
    expect(lineNet(t, t.rows[0])).toBeCloseTo(400, 2);
    expect(lineVat(t, t.rows[0])).toBeCloseTo(100, 2);
  });

  it('matches the reference receipt (313.32 incl @25% -> 250.66 excl)', () => {
    const t = amountTable(313.32);
    expect(+lineNet(t, t.rows[0]).toFixed(2)).toBe(250.66);
    expect(+lineVat(t, t.rows[0]).toFixed(2)).toBe(62.66);
  });

  it('adds VAT on top in net mode (amountInclVat=false)', () => {
    const t = amountTable(500, { amountInclVat: false });
    expect(amountIsGross(t)).toBe(false);
    expect(lineNet(t, t.rows[0])).toBe(500);
    expect(lineVat(t, t.rows[0])).toBeCloseTo(125, 2);
  });

  it('is a no-op for 0% VAT', () => {
    const t = amountTable(500, { vatRate: 0 });
    expect(lineNet(t, t.rows[0])).toBe(500);
    expect(lineVat(t, t.rows[0])).toBe(0);
  });

  it('honours a per-row rate override', () => {
    const t = amountTable(106, { vatRate: 25 });
    t.rows[0].vatRate = 6;
    expect(lineNet(t, t.rows[0])).toBeCloseTo(100, 2);
    expect(lineVat(t, t.rows[0])).toBeCloseTo(6, 2);
  });
});

describe('cellValue', () => {
  const t = {
    vatRate: 25,
    columns: [{ id: 'd', type: 'text' }, { id: 'a', type: 'amount' }, { id: 'v', type: 'vat' }, { id: 'e', type: 'amount_excl' }],
    rows: [{ id: 'r', cells: { d: 'Hello', a: 500 } }],
  };
  const row = t.rows[0];
  it('returns the raw cell for plain columns', () => {
    expect(cellValue(t, row, t.columns[0])).toBe('Hello');
  });
  it('computes amount / vat / excl. VAT', () => {
    expect(cellValue(t, row, t.columns[1])).toBe(500);
    expect(cellValue(t, row, t.columns[2])).toBeCloseTo(100, 2);
    expect(cellValue(t, row, t.columns[3])).toBeCloseTo(400, 2);
  });
});

describe('totals', () => {
  it('sums net + VAT across rows (gross)', () => {
    const t = { vatRate: 25, columns: [{ id: 'a', type: 'amount' }], rows: [{ id: 'r1', cells: { a: 500 } }, { id: 'r2', cells: { a: 250 } }] };
    const tt = tableTotals(t);
    expect(tt.netto).toBeCloseTo(600, 2);
    expect(tt.vat).toBeCloseTo(150, 2);
    expect(tt.brutto).toBeCloseTo(750, 2);
  });
  it('sideTotals only counts the matching side', () => {
    const tables = [
      { side: 'income', vatRate: 0, columns: [{ id: 'a', type: 'amount' }], rows: [{ id: 'r', cells: { a: 1000 } }] },
      { side: 'expense', vatRate: 0, columns: [{ id: 'a', type: 'amount' }], rows: [{ id: 'r', cells: { a: 400 } }] },
    ];
    expect(sideTotals(tables, 'income').netto).toBe(1000);
    expect(sideTotals(tables, 'expense').netto).toBe(400);
  });
});

describe('nearestVatRate', () => {
  it('snaps to the closest Swedish rate', () => {
    expect(nearestVatRate(24)).toBe(25);
    expect(nearestVatRate(13)).toBe(12);
    expect(nearestVatRate(5)).toBe(6);
    expect(nearestVatRate(1)).toBe(0);
  });
});

describe('isNumericColumn', () => {
  it('flags money/number types', () => {
    ['amount', 'amount_excl', 'vat', 'number', 'qty', 'price'].forEach((tp) => expect(isNumericColumn(tp)).toBe(true));
    ['text', 'date'].forEach((tp) => expect(isNumericColumn(tp)).toBe(false));
  });
});

describe('dateLabel / migrateDateLabels', () => {
  const t = (s) => s; // identity translator
  it('is side-aware', () => {
    expect(dateLabel(t, 'income')).toBe('Expected payment');
    expect(dateLabel(t, 'expense')).toBe('Due date');
  });
  it('upgrades generic Date labels but leaves custom ones', () => {
    const tables = [
      { side: 'income', columns: [{ id: 'd', type: 'date', label: 'Datum' }] },
      { side: 'expense', columns: [{ id: 'd', type: 'date', label: 'När?' }] },
    ];
    const out = migrateDateLabels(tables, t);
    expect(out[0].columns[0].label).toBe('Expected payment');
    expect(out[1].columns[0].label).toBe('När?');
  });
});
