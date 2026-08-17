import { describe, it, expect } from 'vitest';
import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it('shows hours and minutes together', () => {
    expect(formatDuration(3900000)).toBe('1h 5m'); // 65 min
  });
  it('drops minutes when zero', () => {
    expect(formatDuration(3600000)).toBe('1h'); // 60 min
  });
  it('shows only minutes under an hour', () => {
    expect(formatDuration(300000)).toBe('5m'); // 5 min
  });
  it('is zero/empty-safe', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration()).toBe('0m');
  });
  it('floors partial minutes', () => {
    expect(formatDuration(59000)).toBe('0m');
  });
});
