import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { Button, IconButton, Segmented, PeriodNav } from '@/src/ui-kit';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import GridWorkspaceHeader from '@/src/shared/components/GridWorkspaceHeader';
import { useNavigate, useLocation } from '@/src/shared/routing/routerCompat';
import { useHoursStore } from '@/src/store/hoursStore';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { usePayrollStore } from '@/src/store/payrollStore';
import { useAuthStore } from '@/src/store/authStore';
import { useT } from '@/src/i18n/LanguageProvider';
import { useProjectStore } from '@/src/store/projectStore';
import { getEntityId } from '@/src/utils/entityId';
import { appMessage } from '@/src/utils/appMessage';
import { DOW, HOURS_VIEW_KEY, fmt, grp, isoWeek, netDayHours, periodRange } from '@/src/features/shifts/hoursUtils';
import { useHoursRule } from '@/src/features/shifts/useHoursRule';
import { exportHoursCsv, exportHoursXlsx, exportHoursPdf } from '@/src/features/shifts/hoursExport';
import HoursRulesPopover from '@/src/features/shifts/components/HoursRulesPopover';
import './HoursPage.scss';

export default function HoursPage({ onRegisterExport } = {}) {
  const { grid, loading, fetchGrid, saveAdjustment, saveManualHours } = useHoursStore();
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const section = pathname.split('/').filter(Boolean)[0] || 'company'; // admin | company
  const setDraftPrefill = useInvoiceStore((s) => s.setDraftPrefill);
  const createPayrollRun = usePayrollStore((s) => s.create);
  const projectList = useProjectStore((s) => s.projects);
  const hasCapability = useAuthStore((s) => s.hasCapability);

  const [projectId, setProjectId] = useState(undefined);
  const [basis, setBasis] = useState('planned'); // planned | actual
  const [dayWidth, setDayWidth] = useState(54); // grid zoom: px per day column
  const [mode, setMode] = useState('2w'); // 2w | month | custom
  const [offset, setOffset] = useState(0); // whole-period steps from today
  const [custom, setCustom] = useState({
    from: dayjs().subtract(13, 'day'),
    to: dayjs(),
  });
  const viewReady = useRef(false);

  // Restore the last-used view (basis, range, project) so returning to the
  // grid keeps whatever the user was last looking at.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HOURS_VIEW_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.basis) setBasis(saved.basis);
        if (saved.mode) setMode(saved.mode);
        if (typeof saved.offset === 'number') setOffset(saved.offset);
        if (saved.from && saved.to) setCustom({ from: dayjs(saved.from), to: dayjs(saved.to) });
        if (saved.projectId) setProjectId(saved.projectId);
        if (typeof saved.grace === 'number') setGrace(saved.grace);
        if (typeof saved.lunch === 'number') setLunch(saved.lunch);
        if (typeof saved.lunchMin === 'number') setLunchMin(saved.lunchMin);
      }
    } catch { /* ignore */ }
    viewReady.current = true;
  }, []);

  const selectMode = (nextMode) => { setMode(nextMode); setOffset(0); };
  const [grace, setGrace] = useState(20); // minutes
  // Unpaid lunch deducted from totals (billing/payroll), not from the displayed
  // per-day cells. `lunch` = hours/day, only on days worked >= `lunchMin` hours.
  const [lunch, setLunch] = useState(0);
  const [lunchMin, setLunchMin] = useState(6);
  const [showRules, setShowRules] = useState(false);
  // Shift-anchored "log your hours" reminder rule (company-wide).
  const { rule, ruleSaving, setRuleField, toggleRuleWeekday, saveRule } = useHoursRule();
  const [sort, setSort] = useState({ by: null, dir: 1 });
  const [selRows, setSelRows] = useState(() => new Set());
  const [selCols, setSelCols] = useState(() => new Set());
  const [editing, setEditing] = useState(null); // { workerId, date }
  const editValueRef = useRef('');

  const [from, to] = useMemo(() => periodRange(mode, custom, offset), [mode, custom, offset]);
  const fromKey = from.format('YYYY-MM-DD');
  const toKey = to.format('YYYY-MM-DD');

  // Persist the view once the initial restore has run.
  useEffect(() => {
    if (!viewReady.current) return;
    try {
      localStorage.setItem(HOURS_VIEW_KEY, JSON.stringify({
        basis,
        mode,
        offset,
        from: custom.from.format('YYYY-MM-DD'),
        to: custom.to.format('YYYY-MM-DD'),
        projectId: projectId ?? null,
        grace,
        lunch,
        lunchMin,
      }));
    } catch { /* ignore */ }
  }, [basis, mode, offset, custom, projectId, grace, lunch, lunchMin]);

  useEffect(() => {
    fetchGrid({ projectId, from: fromKey, to: toKey });
  }, [fetchGrid, projectId, fromKey, toKey]);

  // visible day columns
  const days = useMemo(() => {
    const out = [];
    let cur = from.startOf('day');
    const end = to.startOf('day');
    let guard = 0;
    while ((cur.isBefore(end) || cur.isSame(end)) && guard < 400) {
      out.push({
        date: cur.format('YYYY-MM-DD'),
        day: cur.date(),
        dow: DOW[cur.day()],
        we: cur.day() === 0 || cur.day() === 6,
        wk: isoWeek(cur),
      });
      cur = cur.add(1, 'day');
      guard += 1;
    }
    return out;
  }, [from, to]);

  const weekGroups = useMemo(() => {
    const groups = [];
    days.forEach((d) => {
      const last = groups[groups.length - 1];
      if (!last || last.wk !== d.wk) groups.push({ wk: d.wk, span: 1 });
      else last.span += 1;
    });
    return groups;
  }, [days]);

  const graceH = grace / 60;
  const valOf = (cell) => {
    if (basis === 'planned') return cell.planned ?? cell.actual;
    if (basis === 'manual') return cell.manual ?? 0;
    return cell.actual;
  };
  const flagOf = (cell) => {
    if (cell.planned == null) return 'ok';
    const dev = cell.actual - cell.planned;
    if (dev > graceH) return 'over';
    if (-dev > graceH) return 'under';
    return 'ok';
  };
  // Per-day value net of the unpaid-lunch deduction. Cells keep showing the raw
  // measured/planned value; only the totals and the invoice/payroll handoffs use
  // this, so the deduction flows into billing and payroll without a backend change.
  const netOf = (cell) => netDayHours(valOf(cell), lunch, lunchMin);
  const rowTotal = (w) => days.reduce((s, d) => {
    const c = w.cells[d.date];
    return s + (c ? netOf(c) || 0 : 0);
  }, 0);

  const workers = useMemo(() => {
    const list = [...(grid.workers || [])];
    if (sort.by === 'name') list.sort((a, b) => a.name.localeCompare(b.name) * sort.dir);
    else if (sort.by === 'total') list.sort((a, b) => (rowTotal(a) - rowTotal(b)) * sort.dir);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid.workers, sort, days, basis, lunch, lunchMin]);

  const toggleSort = (by) => setSort((s) => (s.by === by ? { by, dir: -s.dir } : { by, dir: 1 }));
  const toggleRow = (id) => setSelRows((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCol = (date) => setSelCols((s) => { const n = new Set(s); n.has(date) ? n.delete(date) : n.add(date); return n; });
  const toggleAll = () => setSelRows((s) => (s.size === workers.length ? new Set() : new Set(workers.map((w) => w.workerId))));
  const clearSel = () => { setSelRows(new Set()); setSelCols(new Set()); };

  // --- inline editing (Planned = adjustment, Manual = worker hours) ---
  // GPS is measured, so it stays read-only; Planned and Manual are both hand-set.
  const editableCell = (w, date) => {
    if (basis !== 'planned' && basis !== 'manual') return false;
    const c = w.cells[date];
    if (c) return Boolean(c.projectId); // existing single-project cell
    return Boolean(projectId); // empty cell: only when a specific project is selected in the filter
  };
  const startEdit = (workerId, date) => {
    const w = workers.find((x) => x.workerId === workerId);
    const c = w?.cells[date];
    if (basis === 'manual') {
      editValueRef.current = c?.manual != null ? String(c.manual) : '';
    } else {
      editValueRef.current = c?.planned != null ? String(c.planned) : String(c?.actual ?? '');
    }
    setEditing({ workerId, date });
  };
  const commitEdit = async (nav) => {
    if (!editing) return;
    const { workerId, date } = editing;
    const w = workers.find((x) => x.workerId === workerId);
    const c = w?.cells[date];
    const effProjectId = c?.projectId || projectId; // empty cell → the selected project
    const v = parseFloat(String(editValueRef.current).replace(',', '.'));
    setEditing(null);
    if (effProjectId && !Number.isNaN(v) && v >= 0) {
      try {
        if (basis === 'manual') {
          if (v !== c?.manual) {
            await saveManualHours({ projectId: effProjectId, workerId, date, durationMs: Math.round(v * 3600000) });
            await fetchGrid({ projectId, from: fromKey, to: toKey });
          }
        } else if (v !== c?.planned) {
          await saveAdjustment({ projectId: effProjectId, workerId, date, plannedHours: Math.round(v * 100) / 100 });
          await fetchGrid({ projectId, from: fromKey, to: toKey });
        }
      } catch { /* handled in store */ }
    }
    if (nav) nav();
  };
  const nextEditable = (workerId, date, dir) => {
    const rowIdx = workers.findIndex((w) => w.workerId === workerId);
    const colIdx = days.findIndex((d) => d.date === date);
    let r = rowIdx;
    let c = colIdx;
    for (let g = 0; g < workers.length * days.length + 2; g += 1) {
      if (dir === 'down') r += 1;
      else if (dir === 'up') r -= 1;
      else if (dir === 'right') { c += 1; if (c >= days.length) { c = 0; r += 1; } }
      else if (dir === 'left') { c -= 1; if (c < 0) { c = days.length - 1; r -= 1; } }
      if (r < 0 || r >= workers.length || c < 0 || c >= days.length) return null;
      const w = workers[r];
      if (editableCell(w, days[c].date)) return { workerId: w.workerId, date: days[c].date };
    }
    return null;
  };
  const onEditKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); const nx = nextEditable(editing.workerId, editing.date, e.shiftKey ? 'up' : 'down'); commitEdit(() => nx && startEdit(nx.workerId, nx.date)); }
    else if (e.key === 'Tab') { e.preventDefault(); const nx = nextEditable(editing.workerId, editing.date, e.shiftKey ? 'left' : 'right'); commitEdit(() => nx && startEdit(nx.workerId, nx.date)); }
    else if (e.key === 'Escape') { setEditing(null); }
  };

  // --- bulk planning (planned basis) ---
  const [fillValue, setFillValue] = useState('');

  const bulkPlan = async (entries) => {
    const valid = entries.filter((e) => e.projectId
      && e.plannedHours != null && !Number.isNaN(e.plannedHours) && e.plannedHours >= 0);
    if (!valid.length) return 0;
    await Promise.all(valid.map((e) => saveAdjustment(e).catch(() => null)));
    await fetchGrid({ projectId, from: fromKey, to: toKey });
    return valid.length;
  };

  const fillSelected = async () => {
    const v = parseFloat(String(fillValue).replace(',', '.'));
    if (Number.isNaN(v) || v < 0) return;
    const cols = selCols.size ? days.filter((d) => selCols.has(d.date)) : days;
    const rows = selRows.size ? workers.filter((w) => selRows.has(w.workerId)) : workers;
    const hours = Math.round(v * 100) / 100;
    const entries = [];
    rows.forEach((w) => cols.forEach((d) => {
      if (!editableCell(w, d.date)) return;
      const eff = w.cells[d.date]?.projectId || projectId;
      if (eff) entries.push({ projectId: eff, workerId: w.workerId, date: d.date, plannedHours: hours });
    }));
    if (!entries.length) {
      appMessage.info(t('Select a project to plan empty cells'));
      return;
    }
    const n = await bulkPlan(entries);
    setFillValue('');
    appMessage.success(`${n} ${t('cells filled')}`);
  };

  const copyToNextPeriod = async () => {
    const span = days.length;
    const entries = [];
    workers.forEach((w) => days.forEach((d) => {
      const c = w.cells[d.date];
      if (!c || c.planned == null || !c.projectId) return;
      entries.push({
        projectId: c.projectId,
        workerId: w.workerId,
        date: dayjs(d.date).add(span, 'day').format('YYYY-MM-DD'),
        plannedHours: c.planned,
      });
    }));
    if (!entries.length) { appMessage.info(t('Nothing to copy')); return; }
    const n = await bulkPlan(entries);
    // Follow the copy into the next window so the result is visible.
    if (mode === 'custom') {
      setCustom((c) => ({ from: c.from.add(span, 'day'), to: c.to.add(span, 'day') }));
    } else {
      setOffset((o) => o + 1);
    }
    appMessage.success(`${n} ${t('shifts copied to next period')}`);
  };

  // --- selection summary ---
  const summary = useMemo(() => {
    const cols = [...selCols].filter((d) => days.some((x) => x.date === d));
    const rows = workers.filter((w) => selRows.has(w.workerId));
    const dayList = cols.length ? days.filter((d) => cols.includes(d.date)) : days;
    let hrs = 0;
    let label = '';
    if (rows.length) {
      hrs = rows.reduce((a, w) => a + dayList.reduce((s, d) => { const c = w.cells[d.date]; return s + (c ? netOf(c) || 0 : 0); }, 0), 0);
      label = `${rows.length} ${t(rows.length === 1 ? 'worker' : 'workers')}${cols.length ? ` × ${cols.length} ${t(cols.length > 1 ? 'days' : 'day')}` : ''}`;
    } else if (cols.length) {
      hrs = workers.reduce((a, w) => a + dayList.reduce((s, d) => { const c = w.cells[d.date]; return s + (c ? netOf(c) || 0 : 0); }, 0), 0);
      label = `${cols.length} ${t(cols.length > 1 ? 'days' : 'day')} · ${t('all workers')}`;
    }
    return { active: rows.length > 0 || cols.length > 0, label, hrs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selRows, selCols, workers, days, basis, lunch, lunchMin]);

  // daily totals
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dailyTotals = useMemo(() => days.map((d) => workers.reduce((s, w) => { const c = w.cells[d.date]; return s + (c ? netOf(c) || 0 : 0); }, 0)), [days, workers, basis, lunch, lunchMin]);
  const grandTotal = workers.reduce((s, w) => s + rowTotal(w), 0);

  // Build one normalized dataset for every export format. Day cells carry the
  // RAW value (what the grid shows); the Total and daily-total row are net of
  // the unpaid-lunch deduction, matching the on-screen grid.
  const buildExportData = () => {
    const num = (x) => (x == null ? null : Math.round(x * 100) / 100);
    const headers = [t('Employee'), ...days.map((d) => `${d.dow} ${d.day}`), `${t('Total')} (${basisLabel})`];
    const rows = workers.map((w) => ({
      name: w.name,
      cells: days.map((d) => { const c = w.cells[d.date]; return c ? num(valOf(c)) : null; }),
      total: num(rowTotal(w)),
    }));
    const totalRow = { name: t('Daily total'), cells: dailyTotals.map(num), total: num(grandTotal) };
    const subtitle = [basisLabel, lunch > 0 ? `−${fmt(lunch)} h ${t('Unpaid lunch').toLowerCase()} (≥ ${fmt(lunchMin)} h)` : '']
      .filter(Boolean).join(' · ');
    return {
      fileBase: `hours_${fromKey}_${toKey}`,
      title: `${t('Hours')} · ${fromKey} – ${toKey}`,
      subtitle,
      headers,
      rows,
      totalRow,
    };
  };

  const doExport = async (kind) => {
    const data = buildExportData();
    try {
      if (kind === 'xlsx') await exportHoursXlsx(data);
      else if (kind === 'pdf') await exportHoursPdf(data);
      else exportHoursCsv(data);
    } catch {
      appMessage.error(t('Export failed'));
    }
  };

  // Expose export to the parent (ShiftsPage) so the button/menu sits on the
  // tab-bar row. Register a stable wrapper that always calls the latest closure
  // via a ref — avoids re-registering on every render.
  const exportRef = useRef(doExport);
  exportRef.current = doExport;
  useEffect(() => {
    onRegisterExport?.((kind) => exportRef.current?.(kind));
    return () => onRegisterExport?.(null);
  }, [onRegisterExport]);

  const draftInvoice = () => {
    if (!summary.active) return;

    // Billing on a non-measured source (Planned/Manual instead of GPS) is a
    // financial-control decision, gated on the shifts.billingSource capability.
    if (basis !== 'actual' && !hasCapability('shifts.billingSource')) {
      appMessage.warning(
        t('You do not have permission to bill on this hours source. Only GPS/measured is allowed.'),
      );
      return;
    }

    const cols = [...selCols].filter((d) => days.some((x) => x.date === d));
    const dayList = cols.length ? days.filter((d) => cols.includes(d.date)) : days;
    const rows = selRows.size ? workers.filter((w) => selRows.has(w.workerId)) : workers;

    // Sum the selected hours (current basis — planned, GPS or manual) and
    // collect the projects those cells belong to.
    const projectIds = new Set();
    let totalHours = 0;
    for (const w of rows) {
      for (const d of dayList) {
        const c = w.cells[d.date];
        if (!c) continue;
        totalHours += netOf(c) || 0;
        if (c.projectId) projectIds.add(String(c.projectId));
      }
    }
    totalHours = Math.round(totalHours * 100) / 100;
    if (!(totalHours > 0)) { appMessage.info('No hours in the current selection.'); return; }

    // Resolve a single project when possible: the active filter, otherwise the
    // only project present in the selection.
    const singleProjectId = projectId || (projectIds.size === 1 ? [...projectIds][0] : undefined);
    const project = singleProjectId
      ? projectList.find((p) => getEntityId(p) === singleProjectId)
      : undefined;
    const littera = project?.littera || '';
    const rawClient = project?.clientId;
    const clientId = typeof rawClient === 'object' ? rawClient?._id : rawClient;

    const dts = dayList.map((d) => d.date).sort();
    const dateSpan = dts.length ? `${dts[0]} – ${dts[dts.length - 1]}` : '';

    // Auto description = project name(s) + period; fully editable on the invoice.
    const nameOf = (pid) => projectList.find((p) => getEntityId(p) === pid)?.name;
    const projectLabel = project?.name
      || [...projectIds].map(nameOf).filter(Boolean).join(', ');
    const description = [projectLabel, dateSpan].filter(Boolean).join(' · ')
      || (dateSpan ? `Utfört arbete · ${dateSpan}` : 'Utfört arbete');

    // One summary line; the rate goes into À-price on the invoice form.
    const item = {
      description,
      quantity: totalHours,
      unit: 'h',
      price: 0,
      vatRate: 25,
    };

    setDraftPrefill({
      projectId: singleProjectId,
      clientId: clientId || undefined,
      orderReference: littera || undefined,
      items: [item],
    });
    navigate(`/${section}/invoicing/invoices/new`);
  };

  const sendToPayroll = async () => {
    if (!summary.active) return;

    const cols = [...selCols].filter((d) => days.some((x) => x.date === d));
    const dayList = cols.length ? days.filter((d) => cols.includes(d.date)) : days;
    const rows = selRows.size ? workers.filter((w) => selRows.has(w.workerId)) : workers;

    // One payroll line per worker: their total hours (current basis) across the
    // selected days. The salary rate is resolved server-side from each worker's
    // stored hourlyRate.
    const lines = [];
    for (const w of rows) {
      let hrs = 0;
      for (const d of dayList) {
        const c = w.cells[d.date];
        if (c) hrs += netOf(c) || 0;
      }
      hrs = Math.round(hrs * 100) / 100;
      if (hrs > 0) lines.push({ userId: w.workerId, name: w.name, hours: hrs });
    }
    if (!lines.length) { appMessage.info('No hours in the current selection.'); return; }

    const dts = dayList.map((d) => d.date).sort();

    try {
      const run = await createPayrollRun({
        periodFrom: dts[0],
        periodTo: dts[dts.length - 1],
        basis,
        projectId: projectId || undefined,
        lines,
      });
      if (run) navigate(`/${section}/invoicing/payroll/${getEntityId(run)}`);
    } catch {
      // the store surfaces the error message
    }
  };

  const allSel = selRows.size > 0 && selRows.size === workers.length;
  const someSel = selRows.size > 0 && selRows.size < workers.length;
  const monthLabel = from.format('MMMM YYYY');
  const basisLabel = basis === 'planned' ? t('planned') : basis === 'manual' ? t('Manual') : t('GPS');

  return (
    <div className="hours" style={{ '--day-w': `${dayWidth}px` }}>
      <GridWorkspaceHeader
        className="hours-header"
        toggleRow={(
          <>
            <span className="hours-cap grid-workspace-header__label">{t('Hours by')}</span>
            <Segmented
              value={basis}
              onChange={setBasis}
              options={[
                { value: 'planned', label: t('Planned'), color: '#2683f9' },
                { value: 'actual', label: t('GPS'), color: '#2f9e8f' },
                { value: 'manual', label: t('Manual'), color: '#d9880c' },
              ]}
            />
            <ProjectFilterSelect value={projectId} onChange={setProjectId} />
            <div className="hours-rules-wrap">
              <IconButton title={t('Rules & settings')} onClick={() => setShowRules((v) => !v)}>⚙</IconButton>
              <HoursRulesPopover
                open={showRules}
                onClose={() => setShowRules(false)}
                grace={grace}
                setGrace={setGrace}
                lunch={lunch}
                setLunch={setLunch}
                lunchMin={lunchMin}
                setLunchMin={setLunchMin}
                rule={rule}
                ruleSaving={ruleSaving}
                setRuleField={setRuleField}
                toggleRuleWeekday={toggleRuleWeekday}
                saveRule={saveRule}
              />
            </div>
          </>
        )}
        periodRow={(
          <>
            <Segmented
              value={mode}
              onChange={selectMode}
              options={[
                { value: '2w', label: t('2 weeks') },
                { value: 'month', label: t('Month') },
                { value: 'custom', label: t('Custom') },
              ]}
            />
            {mode === 'custom' ? (
              <div className="hours-field">
                <span
                  className="hours-date"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => e.currentTarget.querySelector('input')?.showPicker?.()}
                >
                  <span className="fl">{t('From')}</span>
                  <input type="date" value={custom.from.format('YYYY-MM-DD')} onChange={(e) => setCustom((c) => ({ ...c, from: dayjs(e.target.value) }))} />
                </span>
                <span
                  className="hours-date"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => e.currentTarget.querySelector('input')?.showPicker?.()}
                >
                  <span className="fl">{t('To')}</span>
                  <input type="date" value={custom.to.format('YYYY-MM-DD')} onChange={(e) => setCustom((c) => ({ ...c, to: dayjs(e.target.value) }))} />
                </span>
              </div>
            ) : (
              <PeriodNav
                onPrev={() => setOffset((o) => o - 1)}
                onNext={() => setOffset((o) => o + 1)}
                onToday={offset !== 0 ? () => setOffset(0) : undefined}
                prevLabel={t('Previous period')}
                nextLabel={t('Next period')}
                todayLabel={t('Today')}
              >
                {from.format('D MMM')} – {to.format('D MMM YYYY')}
              </PeriodNav>
            )}
            <div className="hours-zoom">
              <IconButton onClick={() => setDayWidth((w) => Math.max(38, w - 8))} aria-label={t('Zoom out')}><ZoomOutOutlined /></IconButton>
              <IconButton onClick={() => setDayWidth((w) => Math.min(104, w + 8))} aria-label={t('Zoom in')}><ZoomInOutlined /></IconButton>
            </div>
            {basis === 'planned' ? (
              <Button variant="secondary" onClick={copyToNextPeriod}>{t('Copy → next period')}</Button>
            ) : null}
          </>
        )}
      />

      <div className="hours-card">
        <div className="hours-scroll">
          <table className="hours-grid">
            <thead>
              <tr>
                <th className="name-h" rowSpan={2}>
                  <div className="cmonth">{monthLabel}</div>
                  <div className="hd">
                    <button
                      type="button"
                      className={`mchk${allSel ? ' on' : ''}${someSel ? ' some' : ''}`}
                      onClick={toggleAll}
                      aria-label="Select all"
                    >✓</button>
                    <button type="button" className="sorth" onClick={() => toggleSort('name')}>
                      {t('Employee')} {sort.by === 'name' ? (sort.dir > 0 ? '▲' : '▼') : ''}
                    </button>
                  </div>
                </th>
                {weekGroups.map((g, i) => (
                  <th key={g.wk} className={`wk${i ? ' wk-split' : ''}`} colSpan={g.span}>{t('Week')} {g.wk}</th>
                ))}
                <th className="tot-h" rowSpan={2}>
                  <button type="button" className="sorth" onClick={() => toggleSort('total')}>
                    {t('Total')} {basisLabel} {sort.by === 'total' ? (sort.dir > 0 ? '▲' : '▼') : ''}
                  </button>
                </th>
              </tr>
              <tr>
                {days.map((d, i) => {
                  const split = i > 0 && days[i - 1].wk !== d.wk;
                  const on = selCols.has(d.date);
                  return (
                    <th key={d.date} className={`day${d.we ? ' we' : ''}${split ? ' wk-split' : ''}${on ? ' colsel' : ''}`} onClick={() => toggleCol(d.date)}>
                      <span className={`cbx${on ? ' on' : ''}`}>✓</span>
                      <div className="dow">{d.dow}</div>
                      <div className="num">{d.day}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const sel = selRows.has(w.workerId);
                const nFlag = Object.values(w.cells).filter((c) => c.planned != null && ['under', 'over'].includes(flagOf(c))).length;
                return (
                  <tr key={w.workerId} className={sel ? 'sel' : ''}>
                    <td className="name-c" onClick={() => toggleRow(w.workerId)}>
                      <div className="emp">
                        <span className={`chk${sel ? ' on' : ''}`}>✓</span>
                        <span className="avatar">{(w.name || '?').slice(0, 2).toUpperCase()}</span>
                        <span className="who">
                          <span className="nm">{w.name}{nFlag ? <span className="warnbadge">{nFlag}</span> : null}</span>
                          <span className="role">{w.profession || w.role || ''}</span>
                        </span>
                      </div>
                    </td>
                    {days.map((d, i) => {
                      const c = w.cells[d.date];
                      const split = i > 0 && days[i - 1].wk !== d.wk;
                      const on = selCols.has(d.date);
                      const cls = `h${d.we ? ' we' : ''}${split ? ' wk-split' : ''}${on ? ' colsel' : ''}`;
                      if (!c) {
                        const canEditEmpty = editableCell(w, d.date);
                        const editingEmpty = editing && editing.workerId === w.workerId && editing.date === d.date;
                        return (
                          <td
                            key={d.date}
                            className={`${cls} empty${canEditEmpty ? ' editable' : ''}`}
                            onClick={() => canEditEmpty && startEdit(w.workerId, d.date)}
                          >
                            {editingEmpty ? (
                              <input
                                className="cell-edit"
                                type="number"
                                step="0.5"
                                min="0"
                                defaultValue={editValueRef.current}
                                autoFocus
                                onChange={(e) => { editValueRef.current = e.target.value; }}
                                onBlur={() => commitEdit()}
                                onKeyDown={onEditKey}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span className="big">·</span>
                            )}
                          </td>
                        );
                      }
                      const f = flagOf(c);
                      const isEdited = basis === 'planned' && c.edited && c.orig != null && c.planned !== c.orig;
                      const isEditing = editing && editing.workerId === w.workerId && editing.date === d.date;
                      const fc = f === 'under' ? ' flag-under' : f === 'over' ? ' flag-over' : '';
                      // Small line under the big value = the OTHER measure, so planned
                      // and GPS are always visible together. In planned mode it's GPS
                      // (only when there is a plan to compare against); in GPS mode it's
                      // the planned hours. The arrow flags a planned-vs-GPS gap.
                      const otherVal = basis === 'planned'
                        ? (c.planned != null ? c.actual : null)
                        : c.planned;
                      const arrow = f === 'over' ? '▲ ' : f === 'under' ? '▼ ' : '';
                      let alt = null;
                      let title = c.planned != null
                        ? `Planned ${fmt(c.planned)} h · GPS ${fmt(c.actual)} h`
                        : '';
                      if (otherVal != null) {
                        const altCls = `alt${f === 'over' ? ' up' : ''}${f === 'under' ? ' down' : ''}`;
                        alt = <span className={altCls}>{arrow}{fmt(otherVal)}</span>;
                      }
                      if (isEdited) {
                        title = `${title ? `${title} · ` : ''}Edited: ${fmt(c.orig)} → ${fmt(c.planned)} h`;
                      }
                      return (
                        <td
                          key={d.date}
                          className={`${cls}${fc}${isEdited ? ' edited' : ''}${editableCell(w, d.date) ? ' editable' : ''}`}
                          title={title || undefined}
                          onClick={() => editableCell(w, d.date) && startEdit(w.workerId, d.date)}
                        >
                          {isEditing ? (
                            <input
                              className="cell-edit"
                              type="number"
                              step="0.5"
                              min="0"
                              defaultValue={editValueRef.current}
                              autoFocus
                              onChange={(e) => { editValueRef.current = e.target.value; }}
                              onBlur={() => commitEdit()}
                              onKeyDown={onEditKey}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              <span className="big">
                                {basis === 'manual' && c.manual == null
                                  ? '·'
                                  : fmt(valOf(c))}
                              </span>
                              {alt}
                            </>
                          )}
                        </td>
                      );
                    })}
                    <td className="tot-c">{grp(rowTotal(w))}</td>
                  </tr>
                );
              })}
              {!loading && workers.length === 0 ? (
                <tr><td className="hours-empty" colSpan={days.length + 2}>{t('No hours for this period.')}</td></tr>
              ) : null}
              {workers.length ? (
                <tr className="totrow">
                  <td className="name-c">{t('Daily total')} · {basisLabel}</td>
                  {days.map((d, i) => {
                    const split = i > 0 && days[i - 1].wk !== d.wk;
                    const dayT = dailyTotals[i];
                    return <td key={d.date} className={`h${d.we ? ' we' : ''}${split ? ' wk-split' : ''}${selCols.has(d.date) ? ' colsel' : ''}`}>{dayT ? grp(dayT) : ''}</td>;
                  })}
                  <td className="tot-c">{grp(grandTotal)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {lunch > 0 ? (
        <p className="hours-lunchnote">
          {t('Totals exclude unpaid lunch')}: −{fmt(lunch)} h/{t('day')}
          {' '}({t('on days ≥')} {fmt(lunchMin)} h)
        </p>
      ) : null}

      {summary.active ? (
        <div className="hours-actionbar">
          <div className="inner">
            <span className="cnt">{summary.label}</span>
            <span className="dot" />
            <span className="hrs">{grp(summary.hrs)} h · {basisLabel}</span>
            <div className="abspace" />
            {basis === 'planned' ? (
              <span className="hours-fill">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={fillValue}
                  placeholder={t('Hours')}
                  onChange={(e) => setFillValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fillSelected(); }}
                />
                <button type="button" className="btn2" onClick={fillSelected}>{t('Fill')}</button>
              </span>
            ) : null}
            <button type="button" className="link-btn" onClick={clearSel}>{t('Clear')}</button>
            <button type="button" className="btn2" onClick={sendToPayroll}>{t('Send to payroll')}</button>
            <button type="button" className="cta" onClick={draftInvoice}>{t('Prepare invoice draft →')}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
