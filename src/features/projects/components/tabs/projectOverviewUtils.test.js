import { describe, it, expect } from 'vitest';
import {
  getUsagePercent,
  toNumber,
  isCompletedTask,
  isOverdueTask,
} from './projectOverviewUtils';

describe('getUsagePercent', () => {
  it('computes a rounded percentage', () => {
    expect(getUsagePercent(50, 100)).toBe(50);
    expect(getUsagePercent(1, 3)).toBe(33);
  });
  it('caps at 100', () => {
    expect(getUsagePercent(150, 100)).toBe(100);
  });
  it('returns 0 when there is no plan', () => {
    expect(getUsagePercent(5, 0)).toBe(0);
    expect(getUsagePercent(5, null)).toBe(0);
  });
});

describe('toNumber', () => {
  it('parses finite numbers', () => {
    expect(toNumber('5')).toBe(5);
    expect(toNumber(4.2)).toBe(4.2);
  });
  it('falls back to 0 for non-numbers', () => {
    expect(toNumber('abc')).toBe(0);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
  });
});

describe('task status predicates', () => {
  const now = new Date('2026-06-15T12:00:00Z').getTime();

  it('isCompletedTask', () => {
    expect(isCompletedTask({ status: 'completed' })).toBe(true);
    expect(isCompletedTask({ status: 'open' })).toBe(false);
  });

  it('isOverdueTask — past due and not completed', () => {
    const past = new Date(now - 2 * 86400000).toISOString();
    expect(Boolean(isOverdueTask({ dueDate: past }, now))).toBe(true);
  });

  it('isOverdueTask — completed tasks are never overdue', () => {
    const past = new Date(now - 2 * 86400000).toISOString();
    expect(Boolean(isOverdueTask({ status: 'completed', dueDate: past }, now))).toBe(false);
  });

  it('isOverdueTask — no due date is not overdue', () => {
    expect(Boolean(isOverdueTask({}, now))).toBe(false);
  });
});
