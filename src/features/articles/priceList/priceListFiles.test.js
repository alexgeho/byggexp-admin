import { describe, expect, it } from 'vitest';
import { guessFileType, isPriceListStale, latestPriceListDate } from './priceListFiles';

describe('guessFileType', () => {
  it('reads the type from the file name', () => {
    expect(guessFileType('Lunda_Nettoprislista_2026-10.csv')).toBe('net');
    expect(guessFileType('KOPPARPRISER.xlsx')).toBe('copper');
    expect(guessFileType('Huvudprislista styck.txt')).toBe('main');
    expect(guessFileType('')).toBe('main');
  });
});

describe('price list staleness', () => {
  const now = new Date('2026-10-26T12:00:00Z');

  it('takes the latest of main / net / copper', () => {
    expect(latestPriceListDate({ main: '2026-01-01', net: '2026-09-01T00:00:00Z' }).toISOString())
      .toBe('2026-09-01T00:00:00.000Z');
    expect(latestPriceListDate({})).toBeNull();
    expect(latestPriceListDate(undefined)).toBeNull();
  });

  it('is stale when never imported or older than 90 days', () => {
    expect(isPriceListStale(undefined, now)).toBe(true);
    expect(isPriceListStale({}, now)).toBe(true);
    expect(isPriceListStale({ main: '2026-07-01T00:00:00Z' }, now)).toBe(true);
    expect(isPriceListStale({ main: '2026-07-01T00:00:00Z', copper: '2026-10-01T00:00:00Z' }, now)).toBe(false);
  });
});
