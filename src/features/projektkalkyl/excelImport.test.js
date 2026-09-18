import { describe, it, expect } from 'vitest';
import { buildBankRows } from '@/src/features/projektkalkyl/excelImport';

describe('buildBankRows', () => {
  it('maps a single signed amount column', () => {
    const rows = [
      ['2026-01-01', 'Kaffe', '-123,50'],
      ['2026-01-02', 'Faktura', '1 234,56'],
    ];
    const out = buildBankRows(rows, { mode: 'single', dateI: 0, descI: 1, amtI: 2 });
    expect(out).toEqual([
      { description: 'Kaffe', date: '2026-01-01', amount: -123.5 },
      { description: 'Faktura', date: '2026-01-02', amount: 1234.56 },
    ]);
  });

  it('combines separate in/out columns into a signed amount', () => {
    // columns: [date, desc, out, in]
    const rows = [
      ['2026-01-02', 'Lön', '', '5000'],
      ['2026-01-03', 'Material', '800', ''],
    ];
    const out = buildBankRows(rows, { mode: 'inout', dateI: 0, descI: 1, outI: 2, inI: 3 });
    expect(out[0].amount).toBe(5000);
    expect(out[1].amount).toBe(-800);
  });

  it('flips sign to positive for an Expenses table', () => {
    const rows = [['2026-01-01', 'Byggmax', '-500']];
    const out = buildBankRows(rows, { mode: 'single', dateI: 0, descI: 1, amtI: 2, expense: true });
    expect(out[0].amount).toBe(500);
  });

  it('parses European and parenthesised negatives', () => {
    const rows = [
      ['a', '(1 234,56)'],
      ['b', '1.234,56'],
      ['c', '1,234.56'],
    ];
    const out = buildBankRows(rows, { mode: 'single', descI: 0, amtI: 1 });
    expect(out.map((r) => r.amount)).toEqual([-1234.56, 1234.56, 1234.56]);
  });

  it('skips blank lines', () => {
    const rows = [
      ['', '', ''],
      ['Real', '2026-01-01', '10'],
    ];
    const out = buildBankRows(rows, { mode: 'single', descI: 0, dateI: 1, amtI: 2 });
    expect(out).toHaveLength(1);
    expect(out[0].description).toBe('Real');
  });
});
