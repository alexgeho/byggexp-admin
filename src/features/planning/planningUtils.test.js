import { describe, it, expect } from 'vitest';
import {
  upcomingPayments, upcomingReceipts, planningSummary, cleanOcr, isReceivableOpen, invoiceValue,
} from './planningUtils';

// Fixed "now" so day-diffs are deterministic.
const NOW = new Date('2026-09-11T12:00:00Z').getTime();
const day = (offset) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

describe('planningUtils', () => {
  it('cleanOcr keeps digits only', () => {
    expect(cleanOcr('123 45-6 78')).toBe('123456 78'.replace(/\s/g, ''));
    expect(cleanOcr('1234 5678 90')).toBe('1234567890');
    expect(cleanOcr(null)).toBe('');
  });

  it('isReceivableOpen only counts sent/overdue', () => {
    expect(isReceivableOpen({ status: 'sent' })).toBe(true);
    expect(isReceivableOpen({ status: 'overdue' })).toBe(true);
    expect(isReceivableOpen({ status: 'draft' })).toBe(false);
    expect(isReceivableOpen({ status: 'paid' })).toBe(false);
  });

  it('invoiceValue prefers roundedTotal', () => {
    expect(invoiceValue({ total: 100, roundedTotal: 99 })).toBe(99);
    expect(invoiceValue({ total: 100 })).toBe(100);
    expect(invoiceValue({})).toBe(0);
  });

  it('upcomingPayments drops paid + no-due, sorts by due asc, tags tone', () => {
    const supplier = [
      { _id: 'a', status: 'registered', dueDate: day(2), total: 100 },
      { _id: 'b', status: 'paid', dueDate: day(1), total: 999 },
      { _id: 'c', status: 'registered', total: 50 }, // no due date -> dropped
      { _id: 'd', status: 'approved', dueDate: day(-3), total: 200 },
    ];
    const out = upcomingPayments(supplier, NOW);
    expect(out.map((r) => r._id)).toEqual(['d', 'a']);
    expect(out[0]._tone).toBe('overdue');
    expect(out[0]._days).toBe(-3);
    expect(out[1]._tone).toBe('soon');
  });

  it('upcomingReceipts only open invoices with due date', () => {
    const invoices = [
      { _id: '1', status: 'sent', dueDate: day(5), total: 1000 },
      { _id: '2', status: 'draft', dueDate: day(1), total: 500 },
      { _id: '3', status: 'overdue', dueDate: day(-1), roundedTotal: 300, total: 305 },
    ];
    const out = upcomingReceipts(invoices, NOW);
    expect(out.map((r) => r._id)).toEqual(['3', '1']);
    expect(out[0]._value).toBe(300); // roundedTotal wins
  });

  it('planningSummary rolls up horizon + overdue + projected balance', () => {
    const supplier = [
      { status: 'registered', dueDate: day(2), total: 100 }, // in horizon
      { status: 'registered', dueDate: day(-5), total: 50 }, // overdue, in horizon
      { status: 'registered', dueDate: day(90), total: 999 }, // beyond horizon
    ];
    const invoices = [
      { status: 'sent', dueDate: day(10), total: 400 },
      { status: 'overdue', dueDate: day(-2), total: 200 },
    ];
    const s = planningSummary(supplier, invoices, NOW, { bankBalance: 1000, horizonDays: 30 });
    expect(s.payHorizon).toBe(150);
    expect(s.receiveHorizon).toBe(600);
    expect(s.overdueOut).toBe(50);
    expect(s.overdueIn).toBe(200);
    expect(s.netHorizon).toBe(450);
    expect(s.projectedBalance).toBe(1450);
  });
});
