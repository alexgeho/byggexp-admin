import { describe, expect, it } from 'vitest';
import { rebillPrefill } from './rebill';

describe('rebillPrefill', () => {
  it('one line per bill with påslag, ids and project', () => {
    const p = rebillPrefill([
      { _id: 'a', projectId: 'p1', supplierName: 'Ahlsell', invoiceNumber: '9', amountExclVat: 1000 },
      { _id: 'b', projectId: 'p1', supplierName: 'Dahl', amountExclVat: 99.99 },
    ], 15);
    expect(p.projectId).toBe('p1');
    expect(p.supplierInvoiceIds).toEqual(['a', 'b']);
    expect(p.items.map((i) => [i.description, i.price])).toEqual([['Ahlsell 9', 1150], ['Dahl', 114.99]]);
  });
});
