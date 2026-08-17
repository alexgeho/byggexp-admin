import { describe, it, expect } from 'vitest';
import { applyColumnFilters } from './tableColumnFilter';

const columns = [
  { dataIndex: 'name', key: 'name' },
  { dataIndex: 'status', key: 'status' },
  { dataIndex: 'date', key: 'date' },
];
const data = [
  { name: 'Alpha', status: 'open', date: '2026-01-15' },
  { name: 'Beta', status: 'done', date: '2026-02-15' },
  { name: 'Gamma', status: 'open', date: '2026-01-20' },
];

describe('applyColumnFilters', () => {
  it('returns the data unchanged when no filter is active', () => {
    expect(applyColumnFilters(data, columns, {})).toHaveLength(3);
    // a blank search query is not "active"
    expect(applyColumnFilters(data, columns, { name: { type: 'search', query: '  ' } })).toHaveLength(3);
  });

  it('search filter matches a substring (case-insensitive)', () => {
    const out = applyColumnFilters(data, columns, { name: { type: 'search', query: 'alph' } });
    expect(out.map((r) => r.name)).toEqual(['Alpha']);
  });

  it('enum filter keeps only the selected values', () => {
    const out = applyColumnFilters(data, columns, { status: { type: 'enum', values: ['open'] } });
    expect(out.map((r) => r.name)).toEqual(['Alpha', 'Gamma']);
  });

  it('date filter keeps rows inside the range', () => {
    const out = applyColumnFilters(data, columns, {
      date: { type: 'date', from: '2026-01-01', to: '2026-01-31' },
    });
    expect(out.map((r) => r.name)).toEqual(['Alpha', 'Gamma']);
  });

  it('combines filters (AND)', () => {
    const out = applyColumnFilters(data, columns, {
      status: { type: 'enum', values: ['open'] },
      date: { type: 'date', from: '2026-01-18', to: '2026-01-31' },
    });
    expect(out.map((r) => r.name)).toEqual(['Gamma']);
  });
});
