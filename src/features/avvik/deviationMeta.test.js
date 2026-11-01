import { describe, expect, it } from 'vitest';
import { deviationQueryParams, isDeviationOverdue, stockholmDay } from './deviationMeta';

describe('deviationQueryParams (list + export)', () => {
  it('carries project and category', () => {
    expect(deviationQueryParams('p1', 'hms')).toEqual({ projectId: 'p1', category: 'hms' });
    expect(deviationQueryParams(undefined, 'quality')).toEqual({ category: 'quality' });
    expect(deviationQueryParams(null, undefined)).toEqual({});
  });
});

describe('isDeviationOverdue', () => {
  it('counts days on the Stockholm calendar', () => {
    const now = new Date('2026-11-09T23:30:00Z'); // 00:30 on the 10th in Stockholm
    expect(stockholmDay(now)).toBe('2026-11-10');
    expect(isDeviationOverdue({ status: 'open', dueDate: '2026-11-09T00:00:00.000Z' }, now)).toBe(true);
    expect(isDeviationOverdue({ status: 'open', dueDate: '2026-11-10T00:00:00.000Z' }, now)).toBe(false);
    expect(isDeviationOverdue({ status: 'closed', dueDate: '2026-01-01' }, now)).toBe(false);
  });
});
