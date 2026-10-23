import { describe, expect, it } from 'vitest';
import { dayReportItems, leaveOnDate, receiptsOnDate, summarizeDay } from './dayReport';

const H = 3600000;

describe('summarizeDay', () => {
  it('splits the day: normal = total − övertid − OB', () => {
    const day = summarizeDay([{ manualDurationMs: 11 * H, durationMs: 9 * H, overtimeMs: 2 * H, overtimeStatus: 'pending', obMs: 1 * H, obStatus: 'approved' }]);
    expect(day.normalMs).toBe(8 * H);
    expect(day.overtimeMs).toBe(2 * H);
    expect(day.obMs).toBe(1 * H);
    expect(day.overtimeStatus).toBe('pending');
    expect(day.obStatus).toBe('approved');
  });

  it('merges a day across projects; waiting wins, full per diem wins', () => {
    const day = summarizeDay([
      { durationMs: 4 * H, obMs: H, obStatus: 'approved', perDiem: 'half', travelKm: 20, dayNote: 'A' },
      { durationMs: 4 * H, obMs: H, obStatus: 'pending', perDiem: 'full', travelKm: 5, travelMinutes: 30, dayNote: 'A' },
    ]);
    expect(day.obStatus).toBe('pending');
    expect(day.perDiem).toBe('full');
    expect(day.travelKm).toBe(25);
    expect(day.notes).toEqual(['A']);
  });
});

describe('dayReportItems', () => {
  it('leaves out empty lines', () => {
    expect(dayReportItems(summarizeDay([{ durationMs: 0 }]))).toEqual([]);
    const keys = dayReportItems(summarizeDay([{ durationMs: 8 * H, travelMinutes: 90, perDiem: 'half' }]), { receipts: [{}] })
      .map((item) => item.key);
    expect(keys).toEqual(['normal', 'travel', 'perDiem', 'receipts']);
  });

  it('formats with a decimal comma', () => {
    const items = dayReportItems(summarizeDay([{ durationMs: 7.5 * H, travelKm: 12.5 }]));
    expect(items.find((i) => i.key === 'normal').value).toBe('7,5 h');
    expect(items.find((i) => i.key === 'km').value).toBe('12,5 km');
  });
});

describe('leaveOnDate / receiptsOnDate', () => {
  const leaves = [
    { userId: 'u1', startDate: '2026-10-05', endDate: '2026-10-07', type: 'sick', status: 'pending' },
    { userId: 'u1', startDate: '2026-10-09', endDate: '2026-10-09', type: 'vab', status: 'rejected' },
  ];
  it('finds the request covering the day, not rejected ones', () => {
    expect(leaveOnDate(leaves, 'u1', '2026-10-06')?.type).toBe('sick');
    expect(leaveOnDate(leaves, 'u1', '2026-10-09')).toBeNull();
    expect(leaveOnDate(leaves, 'u2', '2026-10-06')).toBeNull();
  });
  it('matches receipts by worker and date', () => {
    const expenses = [{ userId: 'u1', date: '2026-10-06T00:00:00.000Z' }, { userId: 'u1', date: '2026-10-07' }];
    expect(receiptsOnDate(expenses, 'u1', '2026-10-06')).toHaveLength(1);
  });
});
