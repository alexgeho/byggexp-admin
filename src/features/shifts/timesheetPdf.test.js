import { describe, expect, it } from 'vitest';
import { buildTimesheet, weekBands } from './timesheetPdf';

const days = [
  { date: '2026-10-23', wk: 43, we: false },
  { date: '2026-10-24', wk: 43, we: true },
  { date: '2026-10-26', wk: 44, we: false },
];

describe('buildTimesheet', () => {
  it('lists each worker with hours per day and totals them', () => {
    const hours = { a: { '2026-10-23': 8, '2026-10-26': 9 }, b: { '2026-10-23': 8 } };
    const sheet = buildTimesheet({
      days,
      rows: [{ workerId: 'a', name: 'Anna' }, { workerId: 'b', name: 'Bo' }],
      hoursOf: (w, d) => hours[w.workerId]?.[d.date],
      groupLabel: '100101',
    });
    expect(sheet.rows).toEqual([
      { name: 'Anna', cells: [8, null, 9], total: 17 },
      { name: 'Bo', cells: [8, null, null], total: 8 },
    ]);
    expect(sheet.totalHours).toBe(25);
    expect(sheet.groupLabel).toBe('100101');
  });

  it('leaves out workers with no hours in the selection', () => {
    const sheet = buildTimesheet({
      days,
      rows: [{ workerId: 'a', name: 'Anna' }],
      hoursOf: () => 0,
    });
    expect(sheet.rows).toEqual([]);
    expect(sheet.totalHours).toBe(0);
  });
});

describe('weekBands', () => {
  it('groups consecutive days of a week', () => {
    expect(weekBands(days)).toEqual([{ wk: 43, span: 2 }, { wk: 44, span: 1 }]);
  });
});
