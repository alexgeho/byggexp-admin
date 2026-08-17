import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { fmt, isoWeek, periodRange } from './hoursUtils';

describe('fmt (sv decimal, 2dp)', () => {
  it('uses a comma separator', () => {
    expect(fmt(1.5)).toBe('1,5');
    expect(fmt(1.234)).toBe('1,23'); // rounded to 2dp
  });
  it('renders whole numbers without decimals', () => {
    expect(fmt(2)).toBe('2');
  });
  it('is null-safe', () => {
    expect(fmt(null)).toBe('');
    expect(fmt(undefined)).toBe('');
  });
});

describe('isoWeek', () => {
  it('week containing the year\'s first Thursday is week 1', () => {
    expect(isoWeek(dayjs('2026-01-01'))).toBe(1); // Thu
  });
  it('the following Monday is week 2', () => {
    expect(isoWeek(dayjs('2026-01-05'))).toBe(2);
  });
});

describe('periodRange', () => {
  it('custom mode returns the provided range', () => {
    const from = dayjs('2026-03-01');
    const to = dayjs('2026-03-31');
    const [start, end] = periodRange('custom', { from, to });
    expect(start).toBe(from);
    expect(end).toBe(to);
  });

  it('2-week mode spans 14 days', () => {
    const [start, end] = periodRange('2w', null, 0);
    expect(end.diff(start, 'day')).toBe(13);
  });
});
