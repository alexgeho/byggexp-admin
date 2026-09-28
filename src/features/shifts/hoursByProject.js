// Per-employee, per-project breakdown for the "Excel per employee" export: one
// report file holding every project a worker logged hours on in the period,
// instead of one export per project.
//
// The /hours grid only knows a day's project when that day touched exactly one
// project, so the caller fetches one grid per project (same period) and passes
// them in here. `dayValue(cell)` is the Hours page's own per-day rule (basis,
// no-show, unpaid lunch), so every number matches what the grid shows; it
// returns null for a day that shows as empty.

const round2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const sum = (values) => values.reduce((s, v) => s + (v || 0), 0);

// Stamp each cell with its date — the per-cell rules tell past from upcoming
// days by `cell.date`, exactly as the Hours grid does.
const cellsWithDates = (cells = {}) =>
  Object.fromEntries(Object.entries(cells).map(([date, c]) => [date, { ...c, date }]));

export function buildWorkerProjectBreakdown({ workers, projectGrids, dates, dayValue }) {
  // workerId -> [{ name, cells, total }] across all projects, in the order the
  // project grids are given (the caller sorts them by name).
  const rowsByWorker = new Map();

  projectGrids.forEach(({ projectName, workers: projectWorkers }) => {
    (projectWorkers || []).forEach((pw) => {
      const cells = cellsWithDates(pw.cells);
      const values = dates.map((date) => (cells[date] ? dayValue(cells[date]) : null));
      if (!values.some((v) => v)) return; // no hours on this project in the period

      const key = String(pw.workerId);
      if (!rowsByWorker.has(key)) rowsByWorker.set(key, []);
      rowsByWorker.get(key).push({
        name: projectName,
        cells: values.map(round2),
        total: round2(sum(values)),
      });
    });
  });

  return workers
    .map((w) => {
      const rows = rowsByWorker.get(String(w.workerId)) || [];
      const dailyTotals = dates.map((_, i) => sum(rows.map((r) => r.cells[i])));
      return {
        workerId: w.workerId,
        name: w.name,
        rows,
        dailyTotals: dailyTotals.map(round2),
        total: round2(sum(dailyTotals)),
      };
    })
    .filter((w) => w.rows.length);
}

// Excel sheet names: max 31 chars, none of : \ / ? * [ ], unique per workbook.
export function uniqueSheetName(name, used) {
  const base = (String(name || '').replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim() || 'Sheet').slice(0, 31);
  let candidate = base;
  for (let n = 2; used.has(candidate.toLowerCase()); n += 1) {
    const suffix = ` (${n})`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}
