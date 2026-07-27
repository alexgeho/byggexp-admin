import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Button } from '@/src/ui-kit';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import { useNavigate, useLocation } from '@/src/shared/routing/routerCompat';
import { useHoursStore } from '@/src/store/hoursStore';
import { useInvoiceStore } from '@/src/store/invoiceStore';
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

function periodRange(mode, custom) {
  const today = dayjs();
  if (mode === 'month') {
    return [today.startOf('month'), today.endOf('month')];
  }
  if (mode === 'custom') {
    return [custom.from, custom.to];
  }
  // 2 weeks ending today
  return [today.subtract(13, 'day'), today];
}

export default function HoursPage() {
  const { grid, loading, fetchGrid, saveAdjustment } = useHoursStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const section = pathname.split('/').filter(Boolean)[0] || 'company'; // admin | company
  const setDraftPrefill = useInvoiceStore((s) => s.setDraftPrefill);
  const projectList = useProjectStore((s) => s.projects);

  const [projectId, setProjectId] = useState(undefined);
  const [basis, setBasis] = useState('planned'); // planned | actual
  const [mode, setMode] = useState('2w'); // 2w | month | custom
  const [custom, setCustom] = useState({
    from: dayjs().subtract(13, 'day'),
    to: dayjs(),
  });
  const [grace, setGrace] = useState(20); // minutes
  const [showRules, setShowRules] = useState(false);
  const [sort, setSort] = useState({ by: null, dir: 1 });
  const [selRows, setSelRows] = useState(() => new Set());
  const [selCols, setSelCols] = useState(() => new Set());
  const [editing, setEditing] = useState(null); // { workerId, date }
  const editValueRef = useRef('');

  const [from, to] = useMemo(() => periodRange(mode, custom), [mode, custom]);
  const fromKey = from.format('YYYY-MM-DD');
  const toKey = to.format('YYYY-MM-DD');

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
  const valOf = (cell) => (basis === 'planned' ? cell.planned ?? cell.actual : cell.actual);
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
    const c = w.cells[date];
    return basis === 'planned' && c && c.projectId; // single-project cell only
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
    const v = parseFloat(String(editValueRef.current).replace(',', '.'));
    setEditing(null);
    if (c && !Number.isNaN(v) && v >= 0 && v !== c.planned) {
      try {
        await saveAdjustment({ projectId: c.projectId, workerId, date, plannedHours: Math.round(v * 100) / 100 });
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

  // --- selection summary ---
  const summary = useMemo(() => {
    const cols = [...selCols].filter((d) => days.some((x) => x.date === d));
    const rows = workers.filter((w) => selRows.has(w.workerId));
    const dayList = cols.length ? days.filter((d) => cols.includes(d.date)) : days;
    let hrs = 0;
    let label = '';
    if (rows.length) {
      hrs = rows.reduce((a, w) => a + dayList.reduce((s, d) => { const c = w.cells[d.date]; return s + (c ? valOf(c) || 0 : 0); }, 0), 0);
      label = `${rows.length} ${rows.length === 1 ? 'worker' : 'workers'}${cols.length ? ` × ${cols.length} day${cols.length > 1 ? 's' : ''}` : ''}`;
    } else if (cols.length) {
      hrs = workers.reduce((a, w) => a + dayList.reduce((s, d) => { const c = w.cells[d.date]; return s + (c ? valOf(c) || 0 : 0); }, 0), 0);
      label = `${cols.length} day${cols.length > 1 ? 's' : ''} · all workers`;
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
    if (!projectId) { appMessage.info('Pick a single project to prepare an invoice draft.'); return; }

    const cols = [...selCols].filter((d) => days.some((x) => x.date === d));
    const dayList = cols.length ? days.filter((d) => cols.includes(d.date)) : days;
    const rows = selRows.size ? workers.filter((w) => selRows.has(w.workerId)) : workers;

    const totalHours = rows.reduce(
      (a, w) => a + dayList.reduce((s, d) => { const c = w.cells[d.date]; return s + (c ? valOf(c) || 0 : 0); }, 0),
      0,
    );
    if (!(totalHours > 0)) { appMessage.info('No hours in the current selection.'); return; }

    const project = projectList.find((p) => getEntityId(p) === projectId);
    const projectName = project?.name || '';
    const littera = project?.littera || '';
    const rawClient = project?.clientId;
    const clientId = typeof rawClient === 'object' ? rawClient?._id : rawClient;

    // weeks + date span from the counted days, for the Benämning
    const wks = [...new Set(dayList.map((d) => d.wk))].sort((a, b) => a - b);
    const weeksLabel = wks.length ? (wks.length === 1 ? `v.${wks[0]}` : `v.${wks[0]}-${wks[wks.length - 1]}`) : '';
    const dts = dayList.map((d) => d.date).sort();
    const dateSpan = dts.length ? `${dts[0]} – ${dts[dts.length - 1]}` : '';

    const head = [`Snickeri arbete på Littra - ${littera || '—'}`, weeksLabel].filter(Boolean).join(' ');
    const meta = [projectName, dateSpan].filter(Boolean).join(' · ');
    const description = meta ? `${head}\n${meta}` : head;

    // One summary line; the rate goes into À-price in the invoice form (Variant 1).
    const item = {
      description,
      quantity: Math.round(totalHours * 100) / 100,
      unit: 'h',
      price: 0,
      vatRate: 25,
    };

    setDraftPrefill({
      projectId,
      clientId: clientId || undefined,
      orderReference: littera || undefined,
      items: [item],
    });
    navigate(`/${section}/invoicing/invoices/new`);
  };

  const allSel = selRows.size > 0 && selRows.size === workers.length;
  const someSel = selRows.size > 0 && selRows.size < workers.length;
  const monthLabel = from.format('MMMM YYYY');

  return (
    <div className="hours">
      <div className="hours-toolbar">
        <span className="hours-cap">Hours by</span>
        <div className="hours-seg">
          <button type="button" className={`plan${basis === 'planned' ? ' on' : ''}`} onClick={() => setBasis('planned')}>
            <span className="swm" />Planned <span className="tag">contracted</span>
          </button>
          <button type="button" className={`gps${basis === 'actual' ? ' on' : ''}`} onClick={() => setBasis('actual')}>
            <span className="swm" />GPS <span className="tag">measured</span>
          </button>
        </div>
        <div className="hours-rules-wrap">
          <button type="button" className="hours-iconbtn" title="Rules & settings" onClick={() => setShowRules((v) => !v)}>⚙</button>
          {showRules ? (
            <>
              <div className="hours-pop-mask" onClick={() => setShowRules(false)} role="presentation" />
              <div className="hours-pop">
                <h4>Rules</h4>
                <div className="hours-pop-row">
                  <span>Grace window<small>GPS drift ignored below this</small></span>
                  <span><input type="number" value={grace} min={0} step={5} onChange={(e) => setGrace(Number(e.target.value) || 0)} /> min</span>
                </div>
                <p className="hours-pop-note">Planned hours come from the project schedule. Rate is set on the invoice step.</p>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="hours-toolbar">
        <div className="hours-miniseg">
          <button type="button" className={mode === '2w' ? 'on' : ''} onClick={() => setMode('2w')}>2 weeks</button>
          <button type="button" className={mode === 'month' ? 'on' : ''} onClick={() => setMode('month')}>Month</button>
          <button type="button" className={mode === 'custom' ? 'on' : ''} onClick={() => setMode('custom')}>Custom</button>
        </div>
        {mode === 'custom' ? (
          <div className="hours-field">
            <span className="fl">From</span>
            <input type="date" value={custom.from.format('YYYY-MM-DD')} onChange={(e) => setCustom((c) => ({ ...c, from: dayjs(e.target.value) }))} />
            <span className="fl">To</span>
            <input type="date" value={custom.to.format('YYYY-MM-DD')} onChange={(e) => setCustom((c) => ({ ...c, to: dayjs(e.target.value) }))} />
          </div>
        ) : (
          <span className="hours-period">{from.format('D MMM')} – {to.format('D MMM YYYY')}</span>
        )}
        <ProjectFilterSelect value={projectId} onChange={setProjectId} />
        <div className="hours-spacer" />
        <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
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
                      Employee {sort.by === 'name' ? (sort.dir > 0 ? '▲' : '▼') : ''}
                    </button>
                  </div>
                </th>
                {weekGroups.map((g, i) => (
                  <th key={g.wk} className={`wk${i ? ' wk-split' : ''}`} colSpan={g.span}>Week {g.wk}</th>
                ))}
                <th className="tot-h" rowSpan={2}>
                  <button type="button" className="sorth" onClick={() => toggleSort('total')}>
                    Total {basis === 'planned' ? 'planned' : 'GPS'} {sort.by === 'total' ? (sort.dir > 0 ? '▲' : '▼') : ''}
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
                      if (!c) return <td key={d.date} className={`${cls} empty`}><span className="big">·</span></td>;
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
                            <><span className="big">{fmt(valOf(c))}</span>{alt}</>
                          )}
                        </td>
                      );
                    })}
                    <td className="tot-c">{grp(rowTotal(w))}</td>
                  </tr>
                );
              })}
              {!loading && workers.length === 0 ? (
                <tr><td className="hours-empty" colSpan={days.length + 2}>No hours for this period.</td></tr>
              ) : null}
              {workers.length ? (
                <tr className="totrow">
                  <td className="name-c">Daily total · {basis === 'planned' ? 'planned' : 'GPS'}</td>
                  {days.map((d, i) => {
                    const split = i > 0 && days[i - 1].wk !== d.wk;
                    const t = dailyTotals[i];
                    return <td key={d.date} className={`h${d.we ? ' we' : ''}${split ? ' wk-split' : ''}${selCols.has(d.date) ? ' colsel' : ''}`}>{t ? grp(t) : ''}</td>;
                  })}
                  <td className="tot-c">{grp(grandTotal)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <p className="hours-hint">Click a planned cell to correct it · <b>Enter</b>/<b>Tab</b> to move. Each cell shows the other measure small below — <b>▲/▼</b> flags a planned-vs-GPS gap. GPS is the measured worked time from shifts.</p>

      {summary.active ? (
        <div className="hours-actionbar">
          <div className="inner">
            <span className="cnt">{summary.label}</span>
            <span className="dot" />
            <span className="hrs">{grp(summary.hrs)} h · {basis === 'planned' ? 'planned' : 'GPS'}</span>
            <div className="abspace" />
            <button type="button" className="link-btn" onClick={clearSel}>Clear</button>
            <button type="button" className="btn2" disabled title="Coming later">Send to payroll</button>
            <button type="button" className="cta" onClick={draftInvoice}>Prepare invoice draft →</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
