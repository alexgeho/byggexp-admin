import { describe, expect, it } from 'vitest';
import { rowsFromSheet } from './parsePriceList';

describe('rowsFromSheet', () => {
  it('reads an Ahlsell-like file with net price', () => {
    const { rows } = rowsFromSheet([
      ['Prislista Ahlsell 2026'],
      ['RSK-nr', 'Benämning', 'Enhet', 'Bruttopris', 'Nettopris'],
      ['1234567', 'Kopparrör 15 mm', 'm', '120,00', '84,50'],
      ['', 'tom rad', '', '', ''],
    ]);
    expect(rows).toEqual([{ articleNumber: '1234567', name: 'Kopparrör 15 mm', unit: 'm', purchasePrice: 84.5 }]);
  });

  it('applies the discount column to the gross price', () => {
    const { rows } = rowsFromSheet([
      ['E-nr', 'Artikeltext', 'Listpris', 'Rabatt %'],
      ['1820012', 'Kabel EKK 3G1,5', 1000, '40%'],
    ]);
    expect(rows[0].purchasePrice).toBe(600);
  });

  it('reports a file without a recognisable header', () => {
    expect(rowsFromSheet([['a', 'b'], [1, 2]]).error).toBe('no-header');
  });
});
