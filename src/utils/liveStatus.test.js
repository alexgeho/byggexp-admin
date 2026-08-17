import { describe, it, expect } from 'vitest';
import {
  getTodayDateKey,
  isShiftTrackedRole,
  buildWorkerShiftMap,
  getLiveStatus,
  getLiveStatusSortPriority,
} from './liveStatus';

describe('getTodayDateKey', () => {
  it('formats YYYY-MM-DD from local date parts', () => {
    expect(getTodayDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(getTodayDateKey(new Date(2026, 10, 30))).toBe('2026-11-30');
  });
});

describe('isShiftTrackedRole', () => {
  it('tracks worker / projectAdmin / companyAdmin only', () => {
    expect(isShiftTrackedRole('worker')).toBe(true);
    expect(isShiftTrackedRole('companyAdmin')).toBe(true);
    expect(isShiftTrackedRole('superadmin')).toBe(false);
  });
});

describe('buildWorkerShiftMap', () => {
  it('groups and sums per worker, ignoring shifts without a workerId', () => {
    const map = buildWorkerShiftMap([
      { workerId: 'w1', durationMs: 1000 },
      { workerId: 'w1', durationMs: 500 },
      { workerId: 'w2', durationMs: 200 },
      { durationMs: 999 }, // no workerId → skipped
    ], 0);

    expect(map.w1.totalDurationMs).toBe(1500);
    expect(map.w1.shifts).toHaveLength(2);
    expect(map.w1.hasShiftToday).toBe(true);
    expect(map.w2.totalDurationMs).toBe(200);
    expect(Object.keys(map)).toEqual(['w1', 'w2']);
  });
});

describe('getLiveStatus', () => {
  it('waiting for approval regardless of role', () => {
    expect(getLiveStatus({ accountStatus: 'waiting_for_approval', role: 'worker' }))
      .toEqual({ kind: 'waiting', label: 'Waiting for approval' });
  });

  it('non-tracked roles are n/a', () => {
    expect(getLiveStatus({ role: 'superadmin' })).toEqual({ kind: 'na' });
  });

  it('working → at_work with a duration label', () => {
    const s = getLiveStatus(
      { role: 'worker', workStatus: 'working' },
      { hasShiftToday: true, totalDurationMs: 3600000 },
    );
    expect(s.kind).toBe('at_work');
    expect(s.durationLabel).toBe('1h');
  });

  it('auto-paused (offline / outside area) → paused', () => {
    expect(getLiveStatus({ role: 'worker', workStatus: 'off_duty', workStatusReason: 'offline' }).kind)
      .toBe('paused');
    expect(getLiveStatus({ role: 'worker', workStatus: 'outside_project_area' }).kind)
      .toBe('paused');
  });

  it('no shift today → missing', () => {
    expect(getLiveStatus({ role: 'worker', workStatus: 'off_duty' }).kind).toBe('missing');
  });

  it('had a shift but off duty now → off_duty', () => {
    expect(getLiveStatus(
      { role: 'worker', workStatus: 'off_duty' },
      { hasShiftToday: true, totalDurationMs: 1000 },
    ).kind).toBe('off_duty');
  });
});

describe('getLiveStatusSortPriority', () => {
  it('ranks waiting < at_work < na', () => {
    expect(getLiveStatusSortPriority({ accountStatus: 'waiting_for_approval' })).toBe(0);
    expect(getLiveStatusSortPriority({ role: 'worker', workStatus: 'working' }, { hasShiftToday: true })).toBe(1);
    expect(getLiveStatusSortPriority({ role: 'superadmin' })).toBe(5);
  });
});
