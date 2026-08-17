import { describe, it, expect } from 'vitest';
import { dateKeyOf, groupTasks, buildMatrix, getDueLabel, DAY } from './myWorkUtils';

const t = (s) => s; // identity translator for deterministic labels
const NOW = new Date('2026-06-15T12:00:00Z').getTime();

describe('dateKeyOf', () => {
  it('formats a local YYYY-MM-DD key', () => {
    expect(dateKeyOf(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateKeyOf(new Date(2026, 10, 30))).toBe('2026-11-30');
  });
});

describe('groupTasks', () => {
  const mine = [
    { _id: 'o', dueDate: new Date(NOW - 5 * DAY).toISOString() }, // overdue
    { _id: 'u', dueDate: new Date(NOW + 5 * DAY).toISOString() }, // upcoming
    { _id: 's' }, // no due date → someday
    { _id: 'd', status: 'completed' }, // done
  ];
  const g = groupTasks(mine, NOW);

  it('buckets by time horizon', () => {
    expect(g.overdue.map((x) => x._id)).toEqual(['o']);
    expect(g.upcoming.map((x) => x._id)).toEqual(['u']);
    expect(g.someday.map((x) => x._id)).toEqual(['s']);
    expect(g.done.map((x) => x._id)).toEqual(['d']);
  });
});

describe('buildMatrix (Eisenhower)', () => {
  const past = new Date(NOW - 2 * DAY).toISOString();
  const future = new Date(NOW + 10 * DAY).toISOString();
  const m = buildMatrix([
    { _id: '1', priority: 'high', dueDate: past }, // important + urgent → do
    { _id: '2', priority: 'high', dueDate: future }, // important, not urgent → decide
    { _id: '3', priority: 'normal', dueDate: past }, // urgent, not important → delegate
    { _id: '4', priority: 'normal', dueDate: future }, // neither → skip
  ], NOW);

  it('routes each task to its quadrant', () => {
    expect(m.do.map((x) => x._id)).toEqual(['1']);
    expect(m.decide.map((x) => x._id)).toEqual(['2']);
    expect(m.delegate.map((x) => x._id)).toEqual(['3']);
    expect(m.skip.map((x) => x._id)).toEqual(['4']);
  });
});

describe('getDueLabel', () => {
  it('labels today', () => {
    const label = getDueLabel({ dueDate: new Date(NOW).toISOString() }, NOW, t);
    expect(label).toEqual({ text: 'Today', tone: 'today' });
  });
  it('labels tomorrow', () => {
    const label = getDueLabel({ dueDate: new Date(NOW + DAY).toISOString() }, NOW, t);
    expect(label).toEqual({ text: 'Tomorrow', tone: 'soon' });
  });
  it('labels overdue by days', () => {
    const label = getDueLabel({ dueDate: new Date(NOW - 2 * DAY).toISOString() }, NOW, t);
    expect(label.tone).toBe('over');
    expect(label.text).toBe('2 d overdue');
  });
  it('returns null without a due date', () => {
    expect(getDueLabel({}, NOW, t)).toBeNull();
  });
});
