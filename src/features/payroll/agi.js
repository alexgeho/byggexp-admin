// AGI helpers for the admin (backend builds the file: src/payroll/agi.ts).

// Last day to declare and pay: the 12th of the next month, the 17th when the
// next month is January or August (employers ≤ 40 MSEK). A weekend moves it
// to the next Monday (holidays are not handled — Skatteverket's calendar wins).
export function agiDeadline(period) {
  const y = Number(String(period).slice(0, 4));
  const m = Number(String(period).slice(4, 6)); // 1–12, the pay month
  const next = new Date(Date.UTC(y, m, 1)); // first day of next month
  const day = [0, 7].includes(next.getUTCMonth()) ? 17 : 12;
  const d = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), day));
  const wd = d.getUTCDay();
  if (wd === 6) d.setUTCDate(d.getUTCDate() + 2);
  if (wd === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Backend problem codes → one short label each.
export function agiProblemLabel(code, t) {
  if (code.startsWith('personalNumber:')) return `${t('Personal number missing')}: ${code.slice(15)}`;
  return {
    orgNumber: t('Company org. number missing'),
    contact: t('Your name, phone and e-mail are needed'),
    employees: t('No approved payroll runs paid this month'),
    period: t('Choose a month'),
  }[code] || code;
}
