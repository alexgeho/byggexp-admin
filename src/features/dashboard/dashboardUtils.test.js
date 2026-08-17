import { describe, it, expect } from 'vitest';
import {
  isOpenTask,
  getDifference,
  getDisplayName,
  addDays,
  countRecordsByDate,
  sumShiftDurationByDate,
  formatHours,
} from './dashboardUtils';

describe('isOpenTask', () => {
  it('treats done/completed/closed as not open', () => {
    expect(isOpenTask({ status: 'open' })).toBe(true);
    expect(isOpenTask({ status: 'DONE' })).toBe(false);
    expect(isOpenTask({ status: 'completed' })).toBe(false);
    expect(isOpenTask({ status: 'closed' })).toBe(false);
    expect(isOpenTask({})).toBe(true);
  });
});

describe('getDifference', () => {
  it('subtracts yesterday from today', () => {
    expect(getDifference(5, 3)).toBe(2);
    expect(getDifference(2, 6)).toBe(-4);
  });
});

describe('getDisplayName', () => {
  it('prefers name/title/projectName/companyName', () => {
    expect(getDisplayName({ name: 'N' })).toBe('N');
    expect(getDisplayName({ title: 'T' })).toBe('T');
    expect(getDisplayName({ companyName: 'C' })).toBe('C');
  });
  it('uses the fallback when empty', () => {
    expect(getDisplayName({}, 'Fallback')).toBe('Fallback');
    expect(getDisplayName(null)).toBe('Untitled');
  });
});

describe('addDays', () => {
  it('shifts a date by whole days', () => {
    const d = addDays(new Date(2026, 0, 10), 5);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
  });
});

describe('countRecordsByDate', () => {
  const records = [
    { createdAt: '2026-06-15T08:00:00Z', status: 'open' },
    { createdAt: '2026-06-15T20:00:00Z', status: 'done' },
    { createdAt: '2026-06-14T08:00:00Z', status: 'open' },
  ];
  const day = new Date(2026, 5, 15);

  it('counts records whose date-field matches the day', () => {
    expect(countRecordsByDate(records, day, ['createdAt'])).toBe(2);
  });
  it('honours the predicate', () => {
    expect(countRecordsByDate(records, day, ['createdAt'], (r) => r.status === 'open')).toBe(1);
  });
});

describe('sumShiftDurationByDate', () => {
  it('sums durations for a given day', () => {
    const shifts = [
      { shiftDate: '2026-06-15', durationMs: 1000 },
      { shiftDate: '2026-06-15', durationMs: 500 },
      { shiftDate: '2026-06-14', durationMs: 9999 },
    ];
    expect(sumShiftDurationByDate(shifts, new Date(2026, 5, 15))).toBe(1500);
  });
});

describe('formatHours', () => {
  it('renders one-decimal hours with an h suffix', () => {
    expect(formatHours(3600000)).toBe('1h');
    expect(formatHours(0)).toBe('0h');
    expect(formatHours(5400000)).toBe('1.5h');
  });
});
