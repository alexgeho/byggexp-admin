// Per-browser preferences for the Financial planning page. The bank balance and
// the payment-reminder lead time have no backend home yet, so they live in
// localStorage — good enough for a single admin planning their own cash flow.
// A future backend can replace read/write without touching the callers.
const LEAD_KEY = 'byggexp.payment.reminderLeadDays';
const BALANCE_KEY = 'byggexp.payment.bankBalance';

const DEFAULT_LEAD_DAYS = 3;

const readNumber = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const writeNumber = (key, value) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, String(value));
};

// How many days before a due date the bell should start reminding. Clamped to
// 0–14 so a stray value can't silence or spam the reminders.
export const getReminderLeadDays = () => {
  const n = readNumber(LEAD_KEY, DEFAULT_LEAD_DAYS);
  return Math.min(14, Math.max(0, Math.round(n)));
};
export const setReminderLeadDays = (days) => writeNumber(LEAD_KEY, Math.min(14, Math.max(0, Math.round(Number(days) || 0))));

export const getBankBalance = () => readNumber(BALANCE_KEY, 0);
export const setBankBalance = (amount) => writeNumber(BALANCE_KEY, Number(amount) || 0);

export { DEFAULT_LEAD_DAYS };
