import { describe, expect, it } from 'vitest';
import { dayDeltaOf, droppedStart, planMove } from './moveBookings';

const docs = [
  { _id: 'a1', userId: 'u1', projectId: 'p1', date: '2026-11-25T00:00:00.000Z', startTime: '', hours: 8 },
  { _id: 'a2', userId: { _id: 'u1' }, projectId: 'p1', date: '2026-11-26T00:00:00.000Z', startTime: '09:00', hours: 4 },
];

describe('planMove', () => {
  it('shifts every day of the run and keeps the person', () => {
    const plan = planMove(docs, { dayDelta: 2 });
    expect(plan.map((p) => p.next)).toEqual([
      { date: '2026-11-27', userId: 'u1' },
      { date: '2026-11-28', userId: 'u1' },
    ]);
    expect(plan.map((p) => p.prev)).toEqual([
      { date: '2026-11-25', userId: 'u1' },
      { date: '2026-11-26', userId: 'u1' },
    ]);
  });

  it('a new time is written, the old one comes back on undo (empty = 07:00)', () => {
    const plan = planMove(docs, { startTime: '10:30' });
    expect(plan[0].next).toEqual({ date: '2026-11-25', userId: 'u1', startTime: '10:30' });
    expect(plan[0].prev.startTime).toBe('07:00');
    expect(plan[1].prev.startTime).toBe('09:00');
  });

  it('moves to another person; crosses a month backwards', () => {
    const plan = planMove(docs, { dayDelta: -30, userId: 'u2' });
    expect(plan[0].next).toEqual({ date: '2026-10-26', userId: 'u2' });
  });

  it('nothing changed → nothing to do', () => {
    expect(planMove(docs, {})).toEqual([]);
    expect(planMove(docs, { dayDelta: 0, userId: 'u1' })).toEqual([]);
  });
});

describe('drag maths', () => {
  it('pixels → whole days', () => {
    expect(dayDeltaOf(95, 40)).toBe(2);
    expect(dayDeltaOf(-70, 40)).toBe(-2);
    expect(dayDeltaOf(10, 0)).toBe(0);
  });
  it('snaps to 15 minutes and stays in the grid', () => {
    expect(droppedStart(487, 60, 360, 1200)).toBe(480);
    expect(droppedStart(100, 60, 360, 1200)).toBe(360);
    expect(droppedStart(1190, 120, 360, 1200)).toBe(1080);
    expect(droppedStart(700, 2000, 360, 1200)).toBe(360);
  });
});
