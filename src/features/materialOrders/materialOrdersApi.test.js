import { describe, expect, it } from 'vitest';
import { addArticleRow, linkableOrders, orderValue, rowsPayload } from './materialOrdersApi';

describe('material order rows', () => {
  const kabel = { _id: 'a1', articleNumber: '1820012', name: 'Kabel', unit: 'm' };

  it('adds an article once, then bumps its quantity', () => {
    const once = addArticleRow([], kabel);
    expect(once).toEqual([{ articleId: 'a1', articleNumber: '1820012', name: 'Kabel', unit: 'm', quantity: 1 }]);
    expect(addArticleRow(once, kabel)[0].quantity).toBe(2);
  });

  it('drops empty rows from the payload', () => {
    expect(rowsPayload([
      { articleId: 'a1', articleNumber: '1', name: 'A', unit: 'st', quantity: '3' },
      { articleNumber: '2', name: 'B', unit: 'st', quantity: 0 },
    ])).toEqual([{ articleId: 'a1', articleNumber: '1', name: 'A', unit: 'st', quantity: 3 }]);
  });
});

describe('ordered material', () => {
  it('values an order at quantity × unitPrice, missing price = 0', () => {
    expect(orderValue({ rows: [{ quantity: 10, unitPrice: 12.5 }, { quantity: 3 }] })).toBe(125);
    expect(orderValue({})).toBe(0);
  });

  const orders = [
    { _id: 'o1', supplier: 'Lundagrossisten', supplierInvoiceId: null },
    { _id: 'o2', supplier: 'Ahlsell', supplierInvoiceId: null },
    { _id: 'o3', supplier: 'Lundagrossisten', supplierInvoiceId: 'inv9' },
    { _id: 'o4', supplier: 'Lundagrossisten', supplierInvoiceId: 'inv1' },
  ];
  const ids = (list) => list.map((o) => o._id);

  it('hides orders billed on another invoice', () => {
    expect(ids(linkableOrders(orders, { invoiceId: 'inv1' }))).toEqual(['o1', 'o2', 'o4']);
  });

  it('filters by supplier, falls back to all when none match', () => {
    expect(ids(linkableOrders(orders, { supplierName: 'lunda' }))).toEqual(['o1']);
    expect(ids(linkableOrders(orders, { supplierName: 'Beijer' }))).toEqual(['o1', 'o2']);
  });

  it('keeps already selected orders', () => {
    expect(ids(linkableOrders(orders, { supplierName: 'Lunda', selected: ['o2'] }))).toEqual(['o1', 'o2']);
  });
});
