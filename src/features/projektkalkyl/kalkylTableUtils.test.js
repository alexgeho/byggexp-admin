import { describe, it, expect } from 'vitest';
import { insertColumn, fillRows } from './kalkylTableUtils';

describe('insertColumn', () => {
  it('inserts by canonical order (date before amount)', () => {
    const cols = [{ id: 't', type: 'text' }, { id: 'a', type: 'amount' }];
    const out = insertColumn(cols, { id: 'd', type: 'date' });
    expect(out.map((c) => c.type)).toEqual(['text', 'date', 'amount']);
  });
  it('places vat / excl. VAT after amount', () => {
    const cols = [{ id: 't', type: 'text' }, { id: 'a', type: 'amount' }];
    const out = insertColumn(insertColumn(cols, { id: 'v', type: 'vat' }), { id: 'e', type: 'amount_excl' });
    expect(out.map((c) => c.type)).toEqual(['text', 'amount', 'vat', 'amount_excl']);
  });
});

describe('fillRows', () => {
  const tb = {
    columns: [{ id: 'd', type: 'text' }, { id: 'dt', type: 'date' }, { id: 'a', type: 'amount' }],
    rows: [
      { id: 'r1', cells: {} },                 // empty
      { id: 'r2', cells: { d: 'existing' } },  // has data
      { id: 'r3', cells: {} },                 // empty
    ],
  };

  it('fills empty rows first, keeping their ids', () => {
    const out = fillRows(tb, [{ cells: { d: 'A' }, vatRate: 25 }]);
    expect(out).toHaveLength(3);
    expect(out[0].id).toBe('r1');          // same row reused
    expect(out[0].cells.d).toBe('A');
    expect(out[1].cells.d).toBe('existing'); // untouched
    expect(out[2].cells).toEqual({});        // still empty
  });

  it('appends overflow once empties run out', () => {
    const out = fillRows(tb, [{ cells: { d: 'A' } }, { cells: { d: 'B' } }, { cells: { d: 'C' } }]);
    expect(out).toHaveLength(4);            // 2 empties filled + 1 appended
    expect(out[0].cells.d).toBe('A');
    expect(out[2].cells.d).toBe('B');
    expect(out[3].cells.d).toBe('C');
  });

  it('does not treat a computed-only value as filling a row', () => {
    const tbVat = { columns: [{ id: 'd', type: 'text' }, { id: 'v', type: 'vat' }], rows: [{ id: 'r1', cells: {} }] };
    const out = fillRows(tbVat, [{ cells: { d: 'X' } }]);
    expect(out[0].cells.d).toBe('X');
  });
});
