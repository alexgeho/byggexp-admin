// Pure helpers for the Financial planning page. One dataset (customer invoices +
// supplier invoices), two views: money going OUT (accounts payable) and money
// coming IN (accounts receivable), plus the KPI rollup that ties them to a
// projected bank balance. Kept side-effect free so it is unit-testable.
import { daysUntilDue, isUnpaid, paymentDueTone } from '@/src/features/purchases/paymentDue';

// A customer invoice is a real receivable only once it has been sent; drafts,
// paid and cancelled invoices are not upcoming money.
const AR_OPEN_STATES = ['sent', 'overdue'];

export const isReceivableOpen = (invoice) => AR_OPEN_STATES.includes(String(invoice?.status || ''));
export const invoiceValue = (invoice) => invoice?.roundedTotal ?? invoice?.total ?? 0;

const decorate = (invoice, now) => ({
  ...invoice,
  _tone: paymentDueTone(invoice, now),
  _days: daysUntilDue(invoice.dueDate, now),
});

const byDueAsc = (a, b) => new Date(a.dueDate) - new Date(b.dueDate);

// Unpaid supplier invoices with a due date — money we still owe — soonest first.
export const upcomingPayments = (supplier, now) => (supplier || [])
  .filter((inv) => isUnpaid(inv) && inv.dueDate)
  .map((inv) => decorate(inv, now))
  .sort(byDueAsc);

// Open (sent/overdue) customer invoices with a due date — money owed to us.
export const upcomingReceipts = (invoices, now) => (invoices || [])
  .filter((inv) => isReceivableOpen(inv) && inv.dueDate)
  .map((inv) => ({ ...decorate(inv, now), _value: invoiceValue(inv) }))
  .sort(byDueAsc);

const sum = (rows, pick) => rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);

// KPI rollup for the top strip. `horizonDays` bounds the "next N days" figures;
// overdue items are always included in those figures (they are still to settle).
export const planningSummary = (supplier, invoices, now, { bankBalance = 0, horizonDays = 30 } = {}) => {
  const ap = upcomingPayments(supplier, now);
  const ar = upcomingReceipts(invoices, now);

  const withinHorizon = (row) => row._days != null && row._days <= horizonDays;

  const payHorizon = sum(ap.filter(withinHorizon), (r) => r.total);
  const receiveHorizon = sum(ar.filter(withinHorizon), (r) => r._value);
  const overdueOut = sum(ap.filter((r) => r._tone === 'overdue'), (r) => r.total);
  const overdueIn = sum(ar.filter((r) => r._tone === 'overdue'), (r) => r._value);

  return {
    bankBalance: Number(bankBalance) || 0,
    payHorizon,
    receiveHorizon,
    overdueOut,
    overdueIn,
    netHorizon: receiveHorizon - payHorizon,
    // Where the bank balance lands after the horizon's known in/out flows.
    projectedBalance: (Number(bankBalance) || 0) + receiveHorizon - payHorizon,
    horizonDays,
    payCount: ap.length,
    receiveCount: ar.length,
  };
};

// Digits-only OCR is what a bank's payment field expects; strip spaces/dashes
// for the copy button while leaving the stored value untouched.
export const cleanOcr = (ocr) => String(ocr || '').replace(/[^0-9]/g, '');

// Manual planning entries are reshaped to look like the invoice records the
// helpers above already understand (flagged `_manual` so the UI can offer a
// delete and skip invoice-only actions). direction 'out' → a payable, 'in' → a
// receivable.
export const manualToSupplier = (entries = []) => entries
  .filter((e) => e.direction === 'out')
  .map((e) => ({ ...e, _manual: true, status: 'registered', supplierName: e.name, total: Number(e.amount) || 0 }));

export const manualToCustomer = (entries = []) => entries
  .filter((e) => e.direction === 'in')
  .map((e) => ({ ...e, _manual: true, status: 'sent', companyName: e.name, total: Number(e.amount) || 0, roundedTotal: Number(e.amount) || 0 }));
