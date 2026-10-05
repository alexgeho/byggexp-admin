import { describe, it, expect } from 'vitest';
import { EmptyCell, withEmptyCells } from './EmptyCell';

const cell = (col, record) => withEmptyCells([col])[0].render(record[col.dataIndex], record, 0);

describe('withEmptyCells', () => {
  it('renders the grey dash for blank values and stray dashes', () => {
    for (const v of [undefined, null, '', '-', '—', ' – ']) {
      expect(cell({ dataIndex: 'a' }, { a: v }).type).toBe(EmptyCell);
      expect(cell({ dataIndex: 'a', render: (x) => x || '-' }, { a: v }).type).toBe(EmptyCell);
      expect(cell({ dataIndex: 'a', render: (x) => <span>{x || '—'}</span> }, { a: v }).type).toBe(EmptyCell);
    }
  });

  it('keeps real values, zero and minus-prefixed numbers', () => {
    expect(cell({ dataIndex: 'a' }, { a: 'Acme' })).toBe('Acme');
    expect(cell({ dataIndex: 'a', render: (x) => x }, { a: 0 })).toBe(0);
    expect(cell({ dataIndex: 'a', render: (x) => x }, { a: '-120 kr' })).toBe('-120 kr');
  });

  it('leaves columns without dataIndex or render alone and wraps only once', () => {
    const col = { key: 'actions' };
    expect(withEmptyCells([col])[0]).toBe(col);
    const once = withEmptyCells([{ dataIndex: 'a' }]);
    expect(withEmptyCells(once)[0]).toBe(once[0]);
  });
});
