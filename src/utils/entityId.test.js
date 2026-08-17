import { describe, it, expect } from 'vitest';
import { getEntityId, matchesEntityId } from './entityId';

describe('getEntityId', () => {
  it('prefers _id, then id', () => {
    expect(getEntityId({ _id: 'a' })).toBe('a');
    expect(getEntityId({ id: 'b' })).toBe('b');
    expect(getEntityId({ _id: 'a', id: 'b' })).toBe('a');
  });
  it('is nullish-safe', () => {
    expect(getEntityId(null)).toBeUndefined();
    expect(getEntityId({})).toBeUndefined();
  });
});

describe('matchesEntityId', () => {
  it('compares as strings', () => {
    expect(matchesEntityId({ _id: 1 }, '1')).toBe(true);
    expect(matchesEntityId({ _id: 'x' }, 'x')).toBe(true);
  });
  it('is false on mismatch', () => {
    expect(matchesEntityId({ _id: 'x' }, 'y')).toBe(false);
  });
  it('is false when either side is missing', () => {
    expect(matchesEntityId(null, 'x')).toBe(false);
    expect(matchesEntityId({ _id: 'x' }, null)).toBe(false);
    expect(matchesEntityId({}, undefined)).toBe(false);
  });
});
