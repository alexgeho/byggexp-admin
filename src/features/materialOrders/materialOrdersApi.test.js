import { describe, expect, it } from 'vitest';
import { addArticleRow, rowsPayload } from './materialOrdersApi';

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
