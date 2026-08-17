import { describe, it, expect } from 'vitest';
import { formatApiError } from './formError';

describe('formatApiError', () => {
  it('joins an array of validation messages', () => {
    expect(formatApiError({ response: { data: { message: ['a', 'b'] } } })).toBe('a, b');
  });
  it('returns a string api message', () => {
    expect(formatApiError({ response: { data: { message: 'boom' } } })).toBe('boom');
  });
  it('falls back to error.message', () => {
    expect(formatApiError(new Error('network down'))).toBe('network down');
  });
  it('uses the fallback when nothing is present', () => {
    expect(formatApiError({})).toBe('Request failed');
    expect(formatApiError({}, 'Could not save')).toBe('Could not save');
  });
});
