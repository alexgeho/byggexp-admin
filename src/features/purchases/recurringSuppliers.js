// Recurring suppliers (rent, insurance, vehicle tax, A-kassa…) send a bill about
// the same day every month. When this month's bill has not arrived a few days
// after that day, it was probably lost — flag it before the reminder with a fee
// does. Learned from the invoice history, so there is nothing to set up.
const GRACE_DAYS = 3;

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const shiftMonth = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const pad = (n) => String(n).padStart(2, '0');

const median = (list) => {
  const s = [...list].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
};

const supplierKey = (inv) => String(inv.supplierOrgNumber || '').replace(/\D/g, '')
  || String(inv.supplierName || '').trim().toLowerCase();

// [{ key, supplierName, expectedDate: 'YYYY-MM-DD', lastAmount }] for suppliers
// billed last month and in at least 2 of the last 3 months, whose bill for the
// current month is GRACE_DAYS past its usual day and still missing.
export const missingRecurringInvoices = (invoices, now = Date.now()) => {
  const today = new Date(now);
  const current = monthKey(today);
  const prev = [1, 2, 3].map((n) => monthKey(shiftMonth(today, -n)));

  const groups = new Map();
  (invoices || []).forEach((inv) => {
    if (inv?._manual || inv?.creditOfId || Number(inv?.total) < 0) return;
    const key = supplierKey(inv);
    const date = new Date(inv.invoiceDate || inv.createdAt || '');
    if (!key || Number.isNaN(date.getTime())) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ inv, date });
  });

  const result = [];
  groups.forEach((rows, key) => {
    const months = new Set(rows.map((r) => monthKey(r.date)));
    if (months.has(current) || !months.has(prev[0])) return;
    if (prev.filter((m) => months.has(m)).length < 2) return;

    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const day = Math.min(median(rows.map((r) => r.date.getDate())), lastDay);
    const expected = new Date(today.getFullYear(), today.getMonth(), day);
    if ((today - expected) / 86400000 < GRACE_DAYS) return;

    const last = rows.reduce((a, b) => (b.date > a.date ? b : a));
    result.push({
      key,
      supplierName: last.inv.supplierName || '—',
      expectedDate: `${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(day)}`,
      lastAmount: Number(last.inv.total) || 0,
    });
  });
  return result.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
};
