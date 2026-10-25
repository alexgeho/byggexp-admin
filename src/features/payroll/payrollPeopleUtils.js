import dayjs from 'dayjs';

// Pure helpers for the Löner people list and the person page: they turn the
// dated wage-basis items from GET /payroll-basis into per-person and per-day
// figures (hours by type, km, traktamente, absence, amount).

export const ISO = 'YYYY-MM-DD';

// Default period: last full calendar month — what a monthly lönekörning pays.
export const lastMonth = () => dayjs().subtract(1, 'month').startOf('month');

export const monthRange = (month) => ({
  from: month.startOf('month').format(ISO),
  to: month.endOf('month').format(ISO),
});

// `?month=2026-10` → dayjs month, falling back to last month.
export const parseMonth = (value) => {
  const parsed = value ? dayjs(`${value}-01`) : null;
  return parsed && parsed.isValid() ? parsed.startOf('month') : lastMonth();
};

const HOUR_FIELDS = {
  hours_normal: 'normal',
  hours_overtime: 'overtime',
  hours_ob: 'ob',
  travel_time: 'travel',
};

const emptyFigures = () => ({
  normal: 0,
  overtime: 0,
  ob: 0,
  travel: 0,
  km: 0,
  perDiem: null, // 'full' | 'half' on a day row
  perDiemDays: 0,
  absence: 0,
  amount: 0,
  projectIds: [],
});

// Adds one day's items to a figures object. Bil km comes as a tax-free and a
// taxable part of the same trip, so the day's km is the larger of the two.
const addDay = (figures, dayItems) => {
  let km = 0;
  let perDiem = null;
  dayItems.forEach((item) => {
    const field = HOUR_FIELDS[item.code];
    if (field) figures[field] += item.quantity;
    if (item.code === 'mileage_taxfree' || item.code === 'mileage_taxable') {
      km = Math.max(km, item.quantity);
    }
    if (item.code === 'per_diem_full_taxfree') perDiem = 'full';
    if (item.code === 'per_diem_half_taxfree' && perDiem !== 'full') perDiem = 'half';
    if (item.kind === 'absence') figures.absence += item.quantity;
    if (item.kind !== 'absence') figures.amount += item.amount;
    if (item.projectId && !figures.projectIds.includes(item.projectId)) {
      figures.projectIds.push(item.projectId);
    }
  });
  figures.km += km;
  if (perDiem) figures.perDiemDays += 1;
  return perDiem;
};

const groupByDate = (items = []) => {
  const byDate = new Map();
  items.forEach((item) => {
    const list = byDate.get(item.date) || [];
    list.push(item);
    byDate.set(item.date, list);
  });
  return byDate;
};

// One person's month in one row: hours by type, km, traktamente days, absence
// and the total amount.
export const summarizeWorker = (worker) => {
  const figures = emptyFigures();
  groupByDate(worker?.items).forEach((dayItems) => addDay(figures, dayItems));
  return figures;
};

// One row per day the person has items, oldest first.
export const dayRows = (worker) => {
  const byDate = groupByDate(worker?.items);
  return [...byDate.keys()].sort().map((date) => {
    const figures = emptyFigures();
    figures.perDiem = addDay(figures, byDate.get(date));
    return { key: date, date, ...figures };
  });
};

// The status a person's row shows in the list.
export const workerStatus = (worker) => {
  if (worker?.exportedAt && worker?.changedAfterExport) return 'payroll_changed';
  if (worker?.exportedAt) return 'payroll_exported';
  return 'payroll_ready';
};

// Ticked for export by default: everyone not yet exported, and anyone whose
// shifts changed after the last export.
export const defaultSelection = (workers = []) => workers
  .filter((w) => !w.exportedAt || w.changedAfterExport)
  .map((w) => w.userId);

export const workedOnProject = (worker, projectId) => !projectId
  || (worker?.items || []).some((item) => item.projectId === projectId);

// Summary order: hours, then their supplements, travel, per diem, absence.
const ITEM_ORDER = [
  'hours_normal', 'hours_overtime', 'supplement_overtime', 'hours_ob', 'supplement_ob',
  'travel_time', 'mileage_taxfree', 'mileage_taxable',
  'per_diem_full_taxfree', 'per_diem_half_taxfree', 'per_diem_taxable',
  'vacation_pay', 'atk',
];
const itemRank = (code) => {
  const index = ITEM_ORDER.indexOf(code);
  return index === -1 ? ITEM_ORDER.length : index;
};

// Collapses a worker's dated items into one row per code (the lönearter).
export const groupItems = (items = []) => {
  const byCode = new Map();
  items.forEach((item) => {
    const row = byCode.get(item.code) || { ...item, quantity: 0, amount: 0, days: 0 };
    row.quantity += item.unit === 'sek' ? 0 : item.quantity;
    row.amount += item.amount;
    row.days += 1;
    byCode.set(item.code, row);
  });
  return [...byCode.values()].sort((a, b) => itemRank(a.code) - itemRank(b.code));
};
