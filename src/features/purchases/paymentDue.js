// Shared urgency logic for supplier-invoice payment deadlines, used by both the
// dashboard "Payments due" panel and the supplier-invoice list. The point is to
// make an approaching or missed due date impossible to overlook so a bill never
// slips into debt collection (inkasso).
const DAY_MS = 86400000;
export const DUE_SOON_DAYS = 7;

export const isUnpaid = (invoice) => String(invoice?.status || '') !== 'paid';

const startOfDay = (ms) => {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// Whole calendar days until the due date; negative means overdue, 0 means today.
// Returns null when there is no usable due date.
export const daysUntilDue = (dueDate, now) => {
  if (!dueDate) return null;
  const due = new Date(dueDate).getTime();
  if (Number.isNaN(due)) return null;
  return Math.round((startOfDay(due) - startOfDay(now)) / DAY_MS);
};

// 'overdue' | 'soon' | 'ok' for an unpaid invoice, or null when it is paid or
// has no due date (so callers can skip colouring it).
export const paymentDueTone = (invoice, now) => {
  if (!isUnpaid(invoice)) return null;
  const days = daysUntilDue(invoice.dueDate, now);
  if (days == null) return null;
  if (days < 0) return 'overdue';
  if (days <= DUE_SOON_DAYS) return 'soon';
  return 'ok';
};
