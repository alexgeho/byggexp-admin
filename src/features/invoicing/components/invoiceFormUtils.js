// Constants and pure helpers for the invoice form — options, the default row,
// money math (subtotal/VAT/rounding) and small value coercions.

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const VAT_RATE_OPTIONS = [25, 12, 6, 0].map((value) => ({
  value,
  label: `${value}%`,
}));

export const DEFAULT_ITEM = {
  articleNumber: '',
  description: '',
  quantity: 1,
  unit: 'st',
  price: 0,
  discount: 0,
  vatRate: 25,
};

// A text-only row (heading/note shown under the priced rows). No amount and
// excluded from the totals.
export const TEXT_ITEM = {
  isText: true,
  description: '',
  quantity: 0,
  unit: '',
  price: 0,
  discount: 0,
  vatRate: 0,
};

// Units that mark a row as labour/hours — used to remember which article the
// client bills labour under, and to pre-fill it on repeat invoices.
const HOUR_UNITS = new Set(['tim', 'timme', 'timmar', 'timma', 'h', 'hr', 'hrs', 'hour', 'hours', 't']);
export const isHourRow = (item) => HOUR_UNITS.has(String(item?.unit || '').trim().toLowerCase());

export const emptyToUndefined = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export const today = () => new Date().toISOString().slice(0, 10);

export const calculateTotals = (items = [], reverseVAT = false) => {
  const priced = items.filter((item) => !item?.isText);
  const subtotal = priced.reduce((sum, item) => {
    const quantity = Number(item?.quantity || 0);
    const price = Number(item?.price || 0);
    const discount = Number(item?.discount || 0);
    return sum + quantity * price * (1 - discount / 100);
  }, 0);
  const vat = reverseVAT
    ? 0
    : priced.reduce((sum, item) => {
      const quantity = Number(item?.quantity || 0);
      const price = Number(item?.price || 0);
      const discount = Number(item?.discount || 0);
      const vatRate = Number(item?.vatRate ?? 25);
      return sum + quantity * price * (1 - discount / 100) * (vatRate / 100);
    }, 0);

  return {
    subtotal,
    vat,
    total: subtotal + vat,
  };
};

export const formatAmount = (value) => new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value || 0);

export const getRowAmount = (item) => {
  const quantity = Number(item?.quantity || 0);
  const price = Number(item?.price || 0);
  const discount = Number(item?.discount || 0);
  return quantity * price * (1 - discount / 100);
};

export const addDaysToDate = (days) => {
  const due = new Date();
  due.setDate(due.getDate() + days);
  return due.toISOString().slice(0, 10);
};
