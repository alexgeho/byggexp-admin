import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Button } from '@/src/ui-kit';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import { useNavigate, useLocation } from '@/src/shared/routing/routerCompat';
import { useHoursStore } from '@/src/store/hoursStore';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { usePayrollStore } from '@/src/store/payrollStore';
import { useT } from '@/src/i18n/LanguageProvider';
import { useProjectStore } from '@/src/store/projectStore';
import { getEntityId } from '@/src/utils/entityId';
import { appMessage } from '@/src/utils/appMessage';
import './HoursPage.scss';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmt = (x) => (x == null ? '' : String(Math.round(x * 100) / 100).replace('.', ','));
const grp = (x) => (Math.round((x || 0) * 10) / 10).toLocaleString('sv-SE');

// ISO week number for a dayjs date.
function isoWeek(d) {
  const date = new Date(Date.UTC(d.year(), d.month(), d.date()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  return (
    1 +
    Math.round(
      ((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    )
  );
}

// `offset` shifts the relative windows by whole periods so you can page back
// into history or forward to plan ahead (0 = the current period).
function periodRange(mode, custom, offset = 0) {
  const today = dayjs();
  if (mode === 'month') {
    const month = today.add(offset, 'month');
    return [month.startOf('month'), month.endOf('month')];
  }
  if (mode === 'custom') {
    return [custom.from, custom.to];
  }
  // 2 weeks, ending `offset` fortnights from today.
  const end = today.add(offset * 14, 'day');
  return [end.subtract(13, 'day'), end];
}

const HOURS_VIEW_KEY = 'byggexp.hours.view.v1';

export default function HoursPage() {
  const { grid, loading, fetchGrid, saveAdjustment } = useHoursStore();
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const section = pathname.split('/').filter(Boolean)[0] || 'company'; // admin | company
  const setDraftPrefill = useInvoiceStore((s) => s.setDraftPrefill);
  const createPayrollRun = usePayrollStore((s) => s.create);
  const projectList = useProjectStore((s) => s.projects);

  const [projectId, setProjectId] = useState(undefined);
  const [basis, setBasis] = useState('planned'); // planned | actual
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
      }
    } catch { /* ignore */ }
    viewReady.current = true;
  }, []);

  const selectMode = (nextMode) => { setMode(nextMode); setOffset(0); };
  const [grace, setGrace] = useState(20); // minutes
  const [showRules, setShowRules] = useState(false);
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
      }));
    } catch { /* ignore */ }
  }, [basis, mode, offset, custom, projectId]);

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
  const rowTotal = (w) => days.reduce((s, d) => {
    const c = w.cells[d.date];
    return s + (c ? valOf(c) || 0 : 0);
  }, 0);

  const workers = useMemo(() => {
    const list = [...(grid.workers || [])];
    if (sort.by === 'name') list.sort((a, b) => a.name.localeCompare(b.name) * sort.dir);
    else if (sort.by === 'total') list.sort((a, b) => (rowTotal(a) - rowTotal(b)) * sort.dir);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid.workers, sort, days, basis]);

  const toggleSort = (by) => setSort((s) => (s.by === by ? { by, dir: -s.dir } : { by, dir: 1 }));
  const toggleRow = (id) => setSelRows((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCol = (date) => setSelCols((s) => { const n = new Set(s); n.has(date) ? n.delete(date) : n.add(date); return n; });
  const toggleAll = () => setSelRows((s) => (s.size === workers.length ? new Set() : new Set(workers.map((w) => w.workerId))));
  const clearSel = () => { setSelRows(new Set()); setSelCols(new Set()); };

  // --- inline editing (planned basis only) ---
  const editableCell = (w, date) => {
    if (basis !== 'planned') return false;
    const c = w.cells[date];
    if (c) return Boolean(c.projectId); // existing single-project cell
    return Boolean(projectId); // empty cell: only when a specific project is selected in the filter
  };
  const startEdit = (workerId, date) => {
    const w = workers.find((x) => x.workerId === workerId);
    const c = w?.cells[date];
    editValueRef.current = c?.planned != null ? String(c.planned) : String(c?.actual ?? '');
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
    if (effProjectId && !Number.isNaN(v) && v >= 0 && v !== c?.planned) {
      try {
        await saveAdjustment({ projectId: effProjectId, workerId, date, plannedHours: Math.round(v * 100) / 100 });
        await fetchGrid({ projectId, from: fromKey, to: toKey });
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
      hrs = rows.reduce((a, w) => a + dayList.reduce((s, d) => { const c = w.cells[d.date]; return s + (c ? valOf(c) || 0 : 0); }, 0), 0);
      label = `${rows.length} ${t(rows.length === 1 ? 'worker' : 'workers')}${cols.length ? ` × ${cols.length} ${t(cols.length > 1 ? 'days' : 'day')}` : ''}`;
    } else if (cols.length) {
      hrs = workers.reduce((a, w) => a + dayList.reduce((s, d) => { const c = w.cells[d.date]; return s + (c ? valOf(c) || 0 : 0); }, 0), 0);
      label = `${cols.length} ${t(cols.length > 1 ? 'days' : 'day')} · ${t('all workers')}`;
    }
    return { active: rows.length > 0 || cols.length > 0, label, hrs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selRows, selCols, workers, days, basis]);

  // daily totals
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dailyTotals = useMemo(() => days.map((d) => workers.reduce((s, w) => { const c = w.cells[d.date]; return s + (c ? valOf(c) || 0 : 0); }, 0)), [days, workers, basis]);
  const grandTotal = workers.reduce((s, w) => s + rowTotal(w), 0);

  const exportCsv = () => {
    const head = ['Worker', ...days.map((d) => d.date), 'Total'];
    const lines = [head.join(';')];
    workers.forEach((w) => {
      const row = [w.name, ...days.map((d) => { const c = w.cells[d.date]; return c ? String(valOf(c) ?? '') : ''; }), String(Math.round(rowTotal(w) * 100) / 100)];
      lines.push(row.join(';'));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hours_${fromKey}_${toKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const draftInvoice = () => {
    if (!summary.active) return;

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
        totalHours += valOf(c) || 0;
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
        if (c) hrs += valOf(c) || 0;
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

  return (
    <div className="hours">
      <div className="hours-toolbar">
        <span className="hours-cap">{t('Hours by')}</span>
        <div className="hours-seg">
          <button type="button" className={`plan${basis === 'planned' ? ' on' : ''}`} onClick={() => setBasis('planned')}>
            <span className="swm" />{t('Planned')} <span className="tag">{t('contracted')}</span>
          </button>
          <button type="button" className={`gps${basis === 'actual' ? ' on' : ''}`} onClick={() => setBasis('actual')}>
            <span className="swm" />{t('GPS')} <span className="tag">{t('measured')}</span>
          </button>
          <button type="button" className={`manual${basis === 'manual' ? ' on' : ''}`} onClick={() => setBasis('manual')}>
            <span className="swm" />{t('Manual')} <span className="tag">{t('worker')}</span>
          </button>
        </div>
        <div className="hours-rules-wrap">
          <button type="button" className="hours-iconbtn" title={t('Rules & settings')} onClick={() => setShowRules((v) => !v)}>⚙</button>
          {showRules ? (
            <>
              <div className="hours-pop-mask" onClick={() => setShowRules(false)} role="presentation" />
              <div className="hours-pop">
                <h4>{t('Rules')}</h4>
                <div className="hours-pop-row">
                  <span>{t('Grace window')}<small>{t('GPS drift ignored below this')}</small></span>
                  <span><input type="number" value={grace} min={0} step={5} onChange={(e) => setGrace(Number(e.target.value) || 0)} /> min</span>
                </div>
                <p className="hours-pop-note">{t('Planned hours come from the project schedule. Rate is set on the invoice step.')}</p>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="hours-toolbar">
        <div className="hours-miniseg">
          <button type="button" className={mode === '2w' ? 'on' : ''} onClick={() => selectMode('2w')}>{t('2 weeks')}</button>
          <button type="button" className={mode === 'month' ? 'on' : ''} onClick={() => selectMode('month')}>{t('Month')}</button>
          <button type="button" className={mode === 'custom' ? 'on' : ''} onClick={() => selectMode('custom')}>{t('Custom')}</button>
        </div>
        {mode === 'custom' ? (
          <div className="hours-field">
            <span className="fl">{t('From')}</span>
            <input type="date" value={custom.from.format('YYYY-MM-DD')} onChange={(e) => setCustom((c) => ({ ...c, from: dayjs(e.target.value) }))} />
            <span className="fl">{t('To')}</span>
            <input type="date" value={custom.to.format('YYYY-MM-DD')} onChange={(e) => setCustom((c) => ({ ...c, to: dayjs(e.target.value) }))} />
          </div>
        ) : (
          <div className="hours-period-nav">
            <button type="button" className="hours-navbtn" onClick={() => setOffset((o) => o - 1)} aria-label={t('Previous period')}>‹</button>
            <span className="hours-period">{from.format('D MMM')} – {to.format('D MMM YYYY')}</span>
            <button type="button" className="hours-navbtn" onClick={() => setOffset((o) => o + 1)} aria-label={t('Next period')}>›</button>
            {offset !== 0 ? (
              <button type="button" className="hours-today" onClick={() => setOffset(0)}>{t('Today')}</button>
            ) : null}
          </div>
        )}
        <ProjectFilterSelect value={projectId} onChange={setProjectId} />
        <div className="hours-spacer" />
        {basis === 'planned' ? (
          <Button variant="secondary" onClick={copyToNextPeriod}>{t('Copy → next period')}</Button>
        ) : null}
        <Button variant="secondary" onClick={exportCsv}>{t('Export CSV')}</Button>
      </div>

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
                    {t('Total')} {t(basis === 'planned' ? 'planned' : 'GPS')} {sort.by === 'total' ? (sort.dir > 0 ? '▲' : '▼') : ''}
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
                  <td className="name-c">{t('Daily total')} · {t(basis === 'planned' ? 'planned' : 'GPS')}</td>
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

      <p className="hours-hint">{t('Click a planned cell to correct it · Enter/Tab to move. Each cell shows the other measure small below — ▲/▼ flags a planned-vs-GPS gap. GPS is the measured worked time from shifts.')}</p>

      {summary.active ? (
        <div className="hours-actionbar">
          <div className="inner">
            <span className="cnt">{summary.label}</span>
            <span className="dot" />
            <span className="hrs">{grp(summary.hrs)} h · {t(basis === 'planned' ? 'planned' : 'GPS')}</span>
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
