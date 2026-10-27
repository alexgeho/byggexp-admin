import { describe, expect, it } from 'vitest';
import { decodeText, detectDelimiter, discountsFromSheet, rowsFromSheet, splitDelimited } from './parsePriceList';

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

describe('Lundagrossisten price files', () => {
  // Shape of a "Mitt Lunda → Prisfiler" Nettopris CSV export (semicolon,
  // Windows-1252, decimal comma).
  const LUNDA_CSV = [
    'Lunda artikelnr;E-nummer;RSK-nummer;Benämning;Enhet;Bruttopris;Rabatt;Nettopris',
    '1001234;1820012;;Kabel EKK 3G1,5 100m;M;"18,40";35;11,96',
    '1005678;;5711234;Kopparrör 15x1 mm;M;"1 120,00";;"84,50"',
    ';;;Summering;;;;',
  ].join('\r\n');

  const latin1 = (s) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

  it('decodes Windows-1252 and splits semicolons with quoted decimals', () => {
    const aoa = splitDelimited(decodeText(latin1(LUNDA_CSV)));
    expect(aoa[0][3]).toBe('Benämning');
    expect(aoa[2][5]).toBe('1 120,00');
  });

  it('reads Lunda columns: own article number wins over E-nr/RSK, net price used', () => {
    const { rows, error } = rowsFromSheet(splitDelimited(decodeText(latin1(LUNDA_CSV))));
    expect(error).toBeNull();
    expect(rows).toEqual([
      { articleNumber: '1001234', name: 'Kabel EKK 3G1,5 100m', unit: 'M', purchasePrice: 11.96 },
      { articleNumber: '1005678', name: 'Kopparrör 15x1 mm', unit: 'M', purchasePrice: 84.5 },
    ]);
  });

  it('reads a Styck file (tab, styckpris + rabattsats) and öre prices', () => {
    const tab = 'Artikelnr\tBenämning\tPrisenhet\tStyckpris (öre)\tRabattsats\n42\tDosa\tST\t2000\t10\n';
    expect(detectDelimiter(tab)).toBe('\t');
    const { rows } = rowsFromSheet(splitDelimited(tab));
    expect(rows).toEqual([{ articleNumber: '42', name: 'Dosa', unit: 'ST', purchasePrice: 18 }]);
  });

  it('does not take "Prisenhet" as the price column', () => {
    const { rows } = rowsFromSheet([
      ['Artikelnr', 'Prisenhet', 'Pris'],
      ['7', 'ST', '12,50'],
    ]);
    expect(rows[0]).toMatchObject({ unit: 'ST', purchasePrice: 12.5 });
  });
});

describe('rabattgrupp + rabattbrev', () => {
  it('keeps the rabattgrupp of a list-priced row, not of a discounted one', () => {
    const { rows } = rowsFromSheet([
      ['Artikelnr', 'Benämning', 'Rabattgrupp', 'Listpris'],
      ['1', 'Rör', 'A1', '100'],
    ]);
    expect(rows[0]).toMatchObject({ purchasePrice: 100, discountGroup: 'A1' });
    const { rows: own } = rowsFromSheet([
      ['Artikelnr', 'Rabattgrupp', 'Listpris', 'Rabattsats'],
      ['1', 'A1', '100', '10'],
    ]);
    expect(own[0].purchasePrice).toBe(90);
    expect(own[0].discountGroup).toBeUndefined();
  });

  it('reads a rabattbrev in percent or as fractions', () => {
    const { rows } = discountsFromSheet([
      ['Kund: Bygg AB'],
      ['Rabattgrupp', 'Benämning', 'Rabatt %'],
      ['A1', 'Rör', '35'],
      ['B2', 'Kopplingar', '22,5 %'],
      ['C3', 'Ventiler', 0.4],
      ['', '', ''],
    ]);
    expect(rows).toEqual([
      { group: 'A1', percent: 35 },
      { group: 'B2', percent: 22.5 },
      { group: 'C3', percent: 40 },
    ]);
  });
});
