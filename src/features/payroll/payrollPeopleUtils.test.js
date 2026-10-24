import { describe, expect, it } from 'vitest';
import {
  dayRows, defaultSelection, summarizeWorker, workedOnProject, workerStatus,
} from './payrollPeopleUtils';

const item = (code, date, quantity, amount = 0, extra = {}) => ({
  code, date, quantity, amount, kind: 'salary', projectId: 'p1', ...extra,
});

const worker = {
  userId: 'u1',
  items: [
    item('hours_normal', '2026-10-01', 8, 2560),
    item('hours_overtime', '2026-10-01', 2, 640),
    item('travel_time', '2026-10-01', 0.5, 60),
    item('mileage_taxfree', '2026-10-01', 34, 85),
    item('mileage_taxable', '2026-10-01', 34, 17),
    item('per_diem_half_taxfree', '2026-10-01', 1, 150),
    item('hours_normal', '2026-10-02', 8, 2560, { projectId: 'p2' }),
    item('sick', '2026-10-03', 8, 0, { kind: 'absence', projectId: undefined }),
  ],
  unattestedDates: ['2026-10-05'],
};

describe('payroll people utils', () => {
  it('sums a month per type without double-counting bil km', () => {
    const s = summarizeWorker(worker);
    expect(s.normal).toBe(16);
    expect(s.overtime).toBe(2);
    expect(s.travel).toBe(0.5);
    expect(s.km).toBe(34);
    expect(s.perDiemDays).toBe(1);
    expect(s.absence).toBe(8);
    expect(s.amount).toBe(2560 + 640 + 60 + 85 + 17 + 150 + 2560);
  });

  it('lists days incl. unattested ones', () => {
    const rows = dayRows(worker);
    expect(rows.map((r) => r.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05']);
    expect(rows[0].perDiem).toBe('half');
    expect(rows[3].unattested).toBe(true);
  });

  it('derives status and default selection', () => {
    expect(workerStatus(worker)).toBe('payroll_unattested');
    expect(workerStatus({ exportedAt: 'x' })).toBe('payroll_exported');
    expect(workerStatus({ exportedAt: 'x', changedAfterExport: true })).toBe('payroll_changed');
    expect(defaultSelection([
      { userId: 'a' }, { userId: 'b', exportedAt: 'x' }, { userId: 'c', exportedAt: 'x', changedAfterExport: true },
    ])).toEqual(['a', 'c']);
  });

  it('filters people by project', () => {
    expect(workedOnProject(worker, 'p2')).toBe(true);
    expect(workedOnProject(worker, 'p3')).toBe(false);
    expect(workedOnProject(worker, undefined)).toBe(true);
  });
});
