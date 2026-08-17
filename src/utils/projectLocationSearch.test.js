import { describe, it, expect } from 'vitest';
import {
  enrichAddressLabelWithQueryHouseNumber,
  DEFAULT_LOCATION_RADIUS_METERS,
  MIN_LOCATION_RADIUS_METERS,
  MAX_LOCATION_RADIUS_METERS,
} from './projectLocationSearch';

describe('enrichAddressLabelWithQueryHouseNumber', () => {
  it('appends the query house number when the street line lacks one', () => {
    expect(enrichAddressLabelWithQueryHouseNumber('Storgatan,Stockholm', 'Storgatan 12'))
      .toBe('Storgatan 12, Stockholm');
  });
  it('leaves the label alone when it already has the number', () => {
    expect(enrichAddressLabelWithQueryHouseNumber('Storgatan 12, Stockholm', 'Storgatan 12'))
      .toBe('Storgatan 12, Stockholm');
  });
  it('leaves the label alone when the street already has a (different) number', () => {
    expect(enrichAddressLabelWithQueryHouseNumber('Storgatan 5, Stockholm', 'Storgatan 12'))
      .toBe('Storgatan 5, Stockholm');
  });
  it('no-ops without a house number in the query or an empty label', () => {
    expect(enrichAddressLabelWithQueryHouseNumber('Storgatan, Stockholm', 'no number')).toBe('Storgatan, Stockholm');
    expect(enrichAddressLabelWithQueryHouseNumber('', 'Storgatan 12')).toBe('');
  });
});

describe('radius constants', () => {
  it('are ordered', () => {
    expect(MIN_LOCATION_RADIUS_METERS).toBeLessThan(DEFAULT_LOCATION_RADIUS_METERS);
    expect(DEFAULT_LOCATION_RADIUS_METERS).toBeLessThan(MAX_LOCATION_RADIUS_METERS);
  });
});
