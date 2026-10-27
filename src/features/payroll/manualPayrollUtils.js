// Pure helpers for Löner → Ny lönekörning (manual run, no shifts module).
// Rows mirror the backend items: hours × timlön for normal/overtime/ob, a
// fixed amount for monthly (månadslön) and other. The backend recomputes all
// figures (tax, net, totals); these only drive the form.

export const HOUR_TYPES = ['normal', 'overtime', 'ob'];
export const ROW_TYPES = [...HOUR_TYPES, 'monthly', 'other'];

export const isHourRow = (row) => HOUR_TYPES.includes(row.type);

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

let seq = 0;
const key = () => `r${(seq += 1)}`;

export const emptyRow = (user, type = 'normal') => ({
  key: key(),
  userId: String(user.userId ?? user._id ?? user.id),
  name: user.name || '',
  type,
  hours: null,
  rate: user.hourlyRate ?? null,
  amount: null,
  label: '',
});

export const rowAmount = (row) => (isHourRow(row)
  ? round2((Number(row.hours) || 0) * (Number(row.rate) || 0))
  : round2(row.amount));

// One empty row per worker; a run being edited brings its own rows first.
export function initialRows(users, run) {
  const rows = [];
  const inRun = new Set();
  for (const line of run?.lines || []) {
    inRun.add(String(line.userId));
    const items = line.items?.length
      ? line.items
      : [{ type: 'normal', hours: line.hours, rate: line.rate }];
    for (const i of items) {
      rows.push({
        key: key(),
        userId: String(line.userId),
        name: line.name || '',
        type: i.type,
        hours: HOUR_TYPES.includes(i.type) ? i.hours : null,
        rate: HOUR_TYPES.includes(i.type) ? i.rate : null,
        amount: HOUR_TYPES.includes(i.type) ? null : i.amount,
        label: i.label || '',
      });
    }
  }
  const others = (users || [])
    .filter((u) => !inRun.has(String(u._id ?? u.id)))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'sv'));
  return [...rows, ...others.map((u) => emptyRow(u))];
}

// Changing type keeps what still makes sense (rate stays on hour rows).
export function changeType(row, type, hourlyRate) {
  if (isHourRow({ type })) {
    return {
      ...row, type, amount: null, rate: row.rate ?? hourlyRate ?? null,
    };
  }
  return { ...row, type, hours: null };
}

// Rows → POST /payroll/manual body; empty rows and workers are left out.
export function buildPayload(rows, period) {
  const byUser = new Map();
  for (const r of rows) {
    const filled = isHourRow(r) ? Number(r.hours) > 0 : Number(r.amount) !== 0 && r.amount != null;
    if (!filled) continue;
    const item = isHourRow(r)
      ? { type: r.type, hours: Number(r.hours), ...(r.rate != null ? { rate: Number(r.rate) } : {}) }
      : { type: r.type, amount: Number(r.amount), ...(r.label ? { label: r.label } : {}) };
    if (!byUser.has(r.userId)) byUser.set(r.userId, []);
    byUser.get(r.userId).push(item);
  }
  return {
    periodFrom: period.from,
    periodTo: period.to,
    employees: [...byUser].map(([userId, items]) => ({ userId, items })),
  };
}

export const totalGross = (rows) => round2(rows.reduce((s, r) => s + rowAmount(r), 0));

// Run tag / list column: where the hours came from.
export const basisLabel = (basis, t) => {
  if (basis === 'actual') return t('GPS');
  if (basis === 'manual') return t('Manual');
  return t('Planned');
};
