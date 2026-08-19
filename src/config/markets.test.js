import { describe, it, expect } from 'vitest';
import {
  vatRatesForCountry, defaultCurrencyForCountry, defaultEmployerRate,
  isRotAvailable, isSieAvailable, isValidNationalId, isValidOrgNumber,
} from '@/src/config/markets';

describe('markets config', () => {
  it('offers country-specific VAT/MVA rates', () => {
    expect(vatRatesForCountry('SE')).toEqual([25, 12, 6, 0]);
    expect(vatRatesForCountry('NO')).toEqual([25, 15, 12, 0]);
    expect(vatRatesForCountry(undefined)).toEqual([25, 12, 6, 0]); // default SE
  });

  it('maps country to its default currency', () => {
    expect(defaultCurrencyForCountry('SE')).toBe('SEK');
    expect(defaultCurrencyForCountry('NO')).toBe('NOK');
    expect(defaultCurrencyForCountry('XX')).toBe('SEK');
  });

  it('uses country-specific employer rate fallbacks', () => {
    expect(defaultEmployerRate('SE')).toBe(31.42);
    expect(defaultEmployerRate('NO')).toBe(14.1);
    expect(defaultEmployerRate(undefined)).toBe(31.42);
  });

  it('enables ROT/SIE only for Sweden (default when unknown)', () => {
    expect(isRotAvailable('SE')).toBe(true);
    expect(isRotAvailable('NO')).toBe(false);
    expect(isRotAvailable(undefined)).toBe(true);
    expect(isSieAvailable('SE')).toBe(true);
    expect(isSieAvailable('NO')).toBe(false);
  });

  it('validates national IDs by country (empty = ok)', () => {
    expect(isValidNationalId('', 'NO')).toBe(true);
    expect(isValidNationalId('12345678901', 'NO')).toBe(true); // 11 digits
    expect(isValidNationalId('123456-7890', 'NO')).toBe(false); // 10 digits
    expect(isValidNationalId('1234567890', 'SE')).toBe(true); // 10
    expect(isValidNationalId('199001011234', 'SE')).toBe(true); // 12
    expect(isValidNationalId('12345678901', 'SE')).toBe(false); // 11
  });

  it('validates org numbers by country', () => {
    expect(isValidOrgNumber('123456789', 'NO')).toBe(true); // 9
    expect(isValidOrgNumber('1234567890', 'NO')).toBe(false); // 10
    expect(isValidOrgNumber('1234567890', 'SE')).toBe(true); // 10
    expect(isValidOrgNumber('', 'SE')).toBe(true);
  });
});
