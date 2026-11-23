import { describe, it, expect } from 'vitest';
import { formatAdminDate, formatAdminDateTime, formatAdminDateRange } from './formatDateTime';

describe('formatAdminDate', () => {
  it('formats as DD.MM.YYYY', () => {
    expect(formatAdminDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('parses YYYY-MM-DD strings', () => {
    expect(formatAdminDate('2026-01-05')).toBe('2026-01-05');
  });
  it('returns the fallback for null / invalid input', () => {
    expect(formatAdminDate(null)).toBe('-');
    expect(formatAdminDate('not-a-date')).toBe('-');
    expect(formatAdminDate(null, '—')).toBe('—');
  });
});

describe('formatAdminDateTime', () => {
  it('appends HH:mm', () => {
    expect(formatAdminDateTime(new Date(2026, 0, 5, 14, 30))).toBe('2026-01-05 14:30');
  });
  it('returns the fallback for invalid input', () => {
    expect(formatAdminDateTime(null)).toBe('-');
  });
});

describe('formatAdminDateRange', () => {
  it('joins both ends with the separator', () => {
    expect(formatAdminDateRange(new Date(2026, 0, 5), new Date(2026, 0, 9))).toBe('2026-01-05 – 2026-01-09');
  });
  it('handles a single open end', () => {
    expect(formatAdminDateRange(new Date(2026, 0, 5), null)).toBe('From 2026-01-05');
    expect(formatAdminDateRange(null, new Date(2026, 0, 9))).toBe('Until 2026-01-09');
  });
  it('is null when neither end is valid', () => {
    expect(formatAdminDateRange(null, null)).toBeNull();
  });
});
