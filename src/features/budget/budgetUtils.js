// Pure helpers for the company budget (plan vs actual). Actuals are aggregated
// per month from real data: customer invoices (income) and supplier invoices +
// approved/reimbursed expenses (costs). Kept side-effect free for unit testing.

const invoiceValue = (invoice) => invoice?.roundedTotal ?? invoice?.total ?? 0;

// Month index 0..11 for a YYYY-MM-DD string in the given year, else -1.
const monthIndexInYear = (dateStr, year) => {
  const s = String(dateStr || '');
  if (s.length < 7) return -1;
  if (Number(s.slice(0, 4)) !== year) return -1;
  const m = Number(s.slice(5, 7));
  return m >= 1 && m <= 12 ? m - 1 : -1;
};

const emptyMonths = () => Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));

// Booked revenue = invoices actually sent to a customer (drafts/cancelled excluded).
const isRevenue = (inv) => ['sent', 'overdue', 'paid'].includes(String(inv?.status || ''));
// Booked cost = an approved/reimbursed expense (submitted/rejected excluded).
const isBookedExpense = (exp) => ['approved', 'reimbursed'].includes(String(exp?.status || ''));

// Actual income/expense per month for a year, from the three money lists.
export function monthlyActuals({ invoices = [], supplier = [], expenses = [] }, year) {
  const months = emptyMonths();

  invoices.filter(isRevenue).forEach((inv) => {
    const i = monthIndexInYear(inv.date, year);
    if (i >= 0) months[i].income += Number(invoiceValue(inv)) || 0;
  });

  supplier.forEach((inv) => {
    const i = monthIndexInYear(inv.invoiceDate, year);
    if (i >= 0) months[i].expense += Number(inv.total) || 0;
  });

  expenses.filter(isBookedExpense).forEach((exp) => {
    const i = monthIndexInYear(exp.date, year);
    if (i >= 0) months[i].expense += Number(exp.amount) || 0;
  });

  return months;
}

// Sum a list of {income, expense} rows into a single total.
export function sumMonths(rows) {
  return (rows || []).reduce(
    (t, m) => ({ income: t.income + (Number(m?.income) || 0), expense: t.expense + (Number(m?.expense) || 0) }),
    { income: 0, expense: 0 },
  );
}

// Localised short month labels (Jan..Dec) for the active language.
export function monthLabels(lang = 'en') {
  return Array.from({ length: 12 }, (_, i) => {
    try {
      return new Date(2020, i, 1).toLocaleDateString(lang, { month: 'short' });
    } catch {
      return `${i + 1}`;
    }
  });
}
