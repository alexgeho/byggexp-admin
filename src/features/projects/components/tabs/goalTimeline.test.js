import { describe, expect, it } from 'vitest';
import { criticalPath, parseDay, stageBar, stageDurationDays, timelineBounds } from './goalTimeline';

const st = (startDate, endDate, dependsOn = []) => ({ startDate, endDate, dependsOn });

describe('parseDay / stageDurationDays', () => {
  it('parses YYYY-MM-DD and returns null for empty/invalid', () => {
    expect(parseDay('2026-07-06')).toBe(Date.UTC(2026, 6, 6));
    expect(parseDay('')).toBeNull();
    expect(parseDay(null)).toBeNull();
    expect(parseDay('nope')).toBeNull();
  });
  it('counts inclusive days', () => {
    expect(stageDurationDays(st('2026-07-06', '2026-07-06'))).toBe(1);
    expect(stageDurationDays(st('2026-07-06', '2026-07-10'))).toBe(5);
    expect(stageDurationDays(st('2026-07-10', '2026-07-06'))).toBe(0); // end before start
    expect(stageDurationDays(st('', ''))).toBe(0);
  });
});

describe('timelineBounds / stageBar', () => {
  it('returns null when nothing is scheduled', () => {
    expect(timelineBounds([st('', ''), st('', '')])).toBeNull();
  });
  it('spans min start to max end inclusive', () => {
    const b = timelineBounds([st('2026-07-06', '2026-07-08'), st('2026-07-10', '2026-07-12')]);
    expect(b.totalDays).toBe(7); // 6..12 inclusive
  });
  it('positions a bar as left/width percentages', () => {
    const stages = [st('2026-07-06', '2026-07-07'), st('2026-07-08', '2026-07-12')];
    const b = timelineBounds(stages);
    const bar0 = stageBar(stages[0], b);
    expect(bar0.left).toBe(0);
    expect(Math.round(bar0.width)).toBe(Math.round((2 / b.totalDays) * 100));
    const bar1 = stageBar(stages[1], b);
    expect(bar1.left).toBeGreaterThan(0);
    expect(stageBar(st('', ''), b)).toBeNull();
  });
});

describe('criticalPath', () => {
  it('returns empty set when there are no dependencies', () => {
    const cp = criticalPath([st('2026-07-06', '2026-07-10'), st('2026-07-06', '2026-07-20')]);
    expect(cp.size).toBe(0);
  });
  it('follows the longest cumulative-duration chain', () => {
    // 0 (2d) -> 1 (5d) -> 2 (1d)  total 8 ; vs a parallel short branch 3 (1d)->1
    const stages = [
      st('2026-07-01', '2026-07-02'), // 0: 2d
      st('2026-07-03', '2026-07-07', [0, 3]), // 1: 5d depends on 0 and 3
      st('2026-07-08', '2026-07-08', [1]), // 2: 1d depends on 1
      st('2026-07-03', '2026-07-03'), // 3: 1d (no deps)
    ];
    const cp = criticalPath(stages);
    expect(cp.has(0)).toBe(true);
    expect(cp.has(1)).toBe(true);
    expect(cp.has(2)).toBe(true);
    expect(cp.has(3)).toBe(false); // shorter predecessor, not on critical path
  });
  it('ignores cycles and out-of-range indices defensively', () => {
    const stages = [
      st('2026-07-01', '2026-07-02', [1]), // cycle 0<->1
      st('2026-07-03', '2026-07-04', [0, 9]), // 9 out of range
    ];
    expect(() => criticalPath(stages)).not.toThrow();
  });
});
