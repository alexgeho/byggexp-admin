'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Checkbox, Dropdown, Input, Modal, Popover, Select } from 'antd';
import {
  AppstoreOutlined, ArrowUpOutlined, ArrowDownOutlined, CaretUpOutlined, CaretDownOutlined, CheckSquareOutlined, CloseOutlined, DeleteOutlined, DownOutlined, RightOutlined,
  FileExcelOutlined, MoreOutlined, PlusOutlined, ProfileOutlined, ScanOutlined, SettingOutlined, UploadOutlined,
} from '@ant-design/icons';
import { formatAmount } from '@/src/utils/formatCurrency';
import {
  KALKYL_COLORS, COLOR_KEYS, VAT_RATES, newColumn, newRow, moveInArray,
  tableTotals, lineAmount, lineNet, lineVat, tableVatRate, dateLabel, sumsNumberCols,
} from '@/src/features/projektkalkyl/kalkylModel';
import { evalFormula, insertColumn } from '@/src/features/projektkalkyl/kalkylTableUtils';
import { downloadImportTemplate } from '@/src/features/projektkalkyl/excelImport';

// A number cell that doubles as a mini formula field: type a number OR an
// arithmetic expression ("2+2", "=10*3", "(1200+300)*1.25") and it computes on
// blur/Enter, like a spreadsheet cell. Shows the grouped number when idle, the
// raw text/formula while editing.
function NumCell({ value, onChange, bold = false, hint }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  // Suppress noisy zero placeholders ("0,00") in empty numeric cells — a blank
  // cell reads cleaner in a dense financial table (signal-to-noise).
  const n = Number(value);
  const blank = value === null || value === undefined || value === '' || (Number.isFinite(n) && n === 0);
  const display = blank ? '' : formatAmount(value);
  const commit = () => {
    setEditing(false);
    onChange(evalFormula(text));
  };
  return (
    <Input
      size="small"
      variant="borderless"
      className="kalkyl-cell-input"
      title={hint}
      // The amount cell is the row's KPI — render it bold + dark so the eye lands
      // on the money (other numeric cells stay quiet muted).
      style={{ width: '100%', textAlign: 'right', fontVariantNumeric: 'tabular-nums', ...(bold ? { fontWeight: 600, color: '#052d50' } : null) }}
      value={editing ? text : display}
      onFocus={() => { setEditing(true); setText(value === null || value === undefined ? '' : String(value)); }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onPressEnter={(e) => e.currentTarget.blur()}
    />
  );
}

// One data row, extracted so the React Compiler memoises it: adding/editing/
// selecting a row then re-renders only the row that actually changed — not all N
// rows. It takes only primitives (precomputed vat/net/amount strings), NOT the
// whole `table`, so a change to one row never changes another row's props.
function KalkylRow({
  row, member, isSelected, visIndex, rowIndex, isLast, selectionActive,
  colMeta, vatText, netText, amountText, tableRate, t, onCheck, setCell, setRowVat, moveRow, removeRow,
}) {
  const chk = (on) => (on ? '✓ ' : '');
  return (
    <tr className={`kalkyl-data-row${member ? ' kalkyl-group-member' : ''}${isSelected ? ' kalkyl-row--selected' : ''}`}>
      <td style={{ textAlign: 'center', padding: '2px' }}>
        <Checkbox checked={isSelected} onChange={(e) => onCheck(row.id, visIndex, e?.nativeEvent?.shiftKey)} />
      </td>
      {colMeta.map((c, ci) => (
        <td key={c.id} style={{ padding: ci === 0 ? '2px 4px 2px 0' : '2px 4px', width: c.width, minWidth: c.minWidth }}>
          {c.type === 'vat' ? (
            <div style={{ textAlign: 'right', padding: '2px 7px', fontVariantNumeric: 'tabular-nums', color: 'var(--muted,#64748b)' }}>
              {vatText}
            </div>
          ) : c.type === 'amount_excl' ? (
            <div style={{ textAlign: 'right', padding: '2px 7px', fontVariantNumeric: 'tabular-nums', color: 'var(--muted,#64748b)' }}>
              {netText}
            </div>
          ) : c.type === 'amount' && amountText != null ? (
            <div style={{ textAlign: 'right', padding: '2px 7px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {amountText}
            </div>
          ) : (c.type === 'amount' || c.type === 'qty' || c.type === 'price' || c.type === 'number') ? (
            <NumCell value={row.cells?.[c.id]} onChange={(v) => setCell(row.id, c.id, v)} bold={c.type === 'amount'} hint={t('Number or formula, e.g. =10*3')} />
          ) : (
            <Input value={row.cells?.[c.id] || ''} onChange={(e) => setCell(row.id, c.id, e.target.value)}
              placeholder={c.type === 'date' ? 'yyyy-mm-dd' : ''} size="small" variant="borderless" className="kalkyl-cell-input"
              // The primary text column (the meaningful counterparty/description) stays
              // dark; other text columns fall to the muted class colour.
              style={{ width: '100%', ...(c.main ? { color: '#052d50' } : null) }} />
          )}
        </td>
      ))}
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        {selectionActive ? null : (
          <Dropdown trigger={['click']} placement="bottomRight" menu={{ items: [
            { key: 'vat', label: t('VAT'), children: [
              { key: 'inherit', label: `${chk(!Number.isFinite(row.vatRate))}${t('Default')} (${tableRate === 0 ? '0%' : `${tableRate}%`})`, onClick: () => setRowVat(row.id, '') },
              ...VAT_RATES.map((rt) => ({ key: `v${rt}`, label: `${chk(row.vatRate === rt)}${rt === 0 ? t('Without VAT') : `${rt}%`}`, onClick: () => setRowVat(row.id, rt) })),
            ] },
            { type: 'divider' },
            { key: 'up', label: t('Move up'), icon: <ArrowUpOutlined />, disabled: rowIndex === 0, onClick: () => moveRow(rowIndex, -1) },
            { key: 'down', label: t('Move down'), icon: <ArrowDownOutlined />, disabled: isLast, onClick: () => moveRow(rowIndex, 1) },
            { type: 'divider' },
            { key: 'del', label: t('Delete'), icon: <DeleteOutlined />, danger: true, onClick: () => removeRow(row.id) },
          ] }}>
            <Button size="small" type="text" icon={<MoreOutlined />} title={t('Row options')} />
          </Dropdown>
        )}
      </td>
    </tr>
  );
}

// Per-type default column widths (px); all >= MIN_COL_W so a fresh column is
// usable, and no column can be dragged below the minimum.
const MIN_COL_W = 70;
const DESC_MIN_W = 90; // the elastic Description column never shrinks below this
const COL_DEFAULT_W = { text: 240, date: 132, amount: 90, number: 96, qty: 88, price: 96, vat: 72, amount_excl: 100 };

export default function KalkylTable({ money, t, table, isFirst, isLast, onChange, onMove, onRemove, onImport, onExtractRows, onScan, onScanFiles, onToggleDetail, startFolded = false, moveTargets = [] }) {
  const [folded, setFolded] = useState(Boolean(startFolded));
  const [dragOver, setDragOver] = useState(false);
  const [sort, setSort] = useState(null); // { colId, dir: 'asc' | 'desc' }
  const cardRef = useRef(null);
  const [barBox, setBarBox] = useState(null); // {left,width} of this table, for the docked bar
  const [newTableName, setNewTableName] = useState(null); // null = closed; string = naming a new table
  // Row selection — lets the user tick a few rows and see their combined sum
  // (e.g. one worker's salary lines across months). Purely a view helper.
  const [selected, setSelected] = useState(() => new Set());
  // Folded groups: each hides its rowIds behind one summary row (view-only).
  const [groups, setGroups] = useState([]);
  const lastCheckIdx = useRef(null);
  // Fold the selected rows into one inline group-header row (view-only). The
  // group is anchored at the topmost selected row so it renders in place.
  const collapseSelected = () => {
    if (!selected.size) return;
    const ids = [...selected];
    const anchorId = ids
      .map((id) => ({ id, idx: (table.rows || []).findIndex((r) => r.id === id) }))
      .filter((x) => x.idx >= 0)
      .sort((a, b) => a.idx - b.idx)[0]?.id ?? ids[0];
    setGroups((gs) => [...gs, { id: `g${Date.now()}${Math.round(Math.random() * 1e6)}`, rowIds: new Set(ids), anchorId, expanded: false }]);
    setSelected(new Set());
  };
  const toggleGroup = (gid) => setGroups((gs) => gs.map((g) => (g.id === gid ? { ...g, expanded: !g.expanded } : g)));
  const ungroup = (gid) => setGroups((gs) => gs.filter((g) => g.id !== gid));
  // Move the selected rows out — into a brand-new table (targetId null) or an
  // existing one (targetId = its id; the page maps columns by type).
  const exportSelected = (targetId = null, newName = null) => {
    if (!selected.size || !onExtractRows) return;
    const moved = (table.rows || []).filter((r) => selected.has(r.id));
    onExtractRows(moved, table.columns, targetId, newName);
    onChange((tb) => ({ ...tb, rows: (tb.rows || []).filter((r) => !selected.has(r.id)) }));
    setSelected(new Set());
  };
  const confirmNewTable = () => {
    exportSelected(null, (newTableName || '').trim() || t('Group'));
    setNewTableName(null);
  };
  // Select every row whose value in this column equals `val` (from the ⋮ menu).
  const selectByValue = (col, val) => {
    const target = String(val ?? '');
    setSelected(new Set((table.rows || []).filter((r) => String(r.cells?.[col.id] ?? '') === target).map((r) => r.id)));
  };
  const palette = KALKYL_COLORS[table.color] || KALKYL_COLORS.grey;
  const tt = tableTotals(table);

  const setCol = (cid, patch) => onChange((tb) => ({ ...tb, columns: tb.columns.map((c) => (c.id === cid ? { ...c, ...patch } : c)) }));
  // The primary Description column flexes to fill and SHRINKS first, so the table
  // never overflows to the right — every other column holds its width. A user-set
  // width wins; otherwise a per-type default (all >= the 70px minimum). Description
  // isn't drag-resized (it's the elastic one); its default is only a floor.
  // The "hero" text column = the one with the most distinct non-empty values,
  // not just the positionally-first one (which on a bank import is the constant
  // "Avsändare"). This makes the meaningful column (counterparty / description)
  // the dark, elastic one instead of a useless constant.
  const firstTextId = (() => {
    const textCols = (table.columns || []).filter((c) => c.type === 'text');
    if (!textCols.length) return undefined;
    const rws = table.rows || [];
    let bestId = textCols[0].id;
    let bestN = -1;
    textCols.forEach((c) => {
      const distinct = new Set(rws.map((r) => String(r.cells?.[c.id] ?? '').trim()).filter(Boolean)).size;
      if (distinct > bestN) { bestN = distinct; bestId = c.id; }
    });
    return bestId;
  })();
  const isMainDesc = (c) => c.id === firstTextId;
  const colW = (c) => (Number.isFinite(c.width) ? c.width : (COL_DEFAULT_W[c.type] || 100));
  const cellWidth = (c) => (isMainDesc(c) ? 'auto' : colW(c));
  const cellMinWidth = (c) => (isMainDesc(c) ? DESC_MIN_W : colW(c));
  // Drag the right edge of a header to resize that column. rAF-throttled so the
  // board doesn't re-render on every mousemove; the final width is committed on
  // mouseup (persisted with the table via autosave/save).
  const startResize = (e, c) => {
    e.preventDefault();
    e.stopPropagation();
    const th = e.currentTarget.closest('th');
    const startX = e.clientX;
    const startW = th ? th.getBoundingClientRect().width : colW(c);
    let raf = 0;
    let pending = startW;
    const apply = () => { raf = 0; setCol(c.id, { width: Math.round(pending) }); };
    const onMove = (ev) => {
      pending = Math.max(MIN_COL_W, startW + (ev.clientX - startX));
      if (!raf) raf = window.requestAnimationFrame(apply);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (raf) window.cancelAnimationFrame(raf);
      setCol(c.id, { width: Math.round(pending) });
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  const colLabelFor = (type) => (type === 'date' ? dateLabel(t, table.side) : type === 'number' ? t('Number') : type === 'amount_excl' ? t('excl. VAT') : type === 'vat' ? t('VAT') : t('Text'));
  const addCol = (type = 'text') => onChange((tb) => ({ ...tb, columns: insertColumn(tb.columns || [], newColumn(colLabelFor(type), type)) }));
  // Insert a new column at an explicit position (left/right of a header), unlike
  // addCol which slots by type order.
  const addColAt = (index, type = 'text') => onChange((tb) => {
    const cols = [...(tb.columns || [])];
    cols.splice(Math.max(0, Math.min(index, cols.length)), 0, newColumn(colLabelFor(type), type));
    return { ...tb, columns: cols };
  });
  // Column-type choices for the "Insert column" submenu (side = L/R just keys them
  // uniquely). Single-instance types are disabled once already present.
  const colTypeItems = (at, side) => [
    { key: `${side}t`, label: t('Text'), onClick: () => addColAt(at, 'text') },
    { key: `${side}n`, label: t('Number'), onClick: () => addColAt(at, 'number') },
    { key: `${side}d`, label: t('Date'), disabled: (table.columns || []).some((c) => c.type === 'date'), onClick: () => addColAt(at, 'date') },
    { key: `${side}v`, label: t('VAT'), disabled: (table.columns || []).some((c) => c.type === 'vat'), onClick: () => addColAt(at, 'vat') },
    { key: `${side}e`, label: t('excl. VAT'), disabled: (table.columns || []).some((c) => c.type === 'amount_excl'), onClick: () => addColAt(at, 'amount_excl') },
  ];
  const removeCol = (cid) => onChange((tb) => ({ ...tb, columns: (tb.columns || []).filter((c) => c.id !== cid) }));
  // Reorder columns by dragging a header's grip onto another header.
  const moveColumn = (from, to) => onChange((tb) => {
    if (from == null || from === to) return tb;
    const cols = [...(tb.columns || [])];
    const [moved] = cols.splice(from, 1);
    cols.splice(to, 0, moved);
    return { ...tb, columns: cols };
  });
  const setCell = (rid, cid, val) => onChange((tb) => ({ ...tb, rows: tb.rows.map((r) => (r.id === rid ? { ...r, cells: { ...r.cells, [cid]: val } } : r)) }));
  // Sort rows by a column in a given direction (from the column's ⋮ menu).
  const applySort = (col, dir) => {
    setSort({ colId: col.id, dir });
    const numeric = ['amount', 'number', 'qty', 'price', 'amount_excl', 'vat'].includes(col.type);
    onChange((tb) => {
      const sorted = [...(tb.rows || [])].sort((a, b) => {
        const va = a.cells?.[col.id]; const vb = b.cells?.[col.id];
        const r = numeric
          ? (Number(va) || 0) - (Number(vb) || 0)
          : String(va ?? '').localeCompare(String(vb ?? ''), undefined, { numeric: true });
        return dir === 'asc' ? r : -r;
      });
      return { ...tb, rows: sorted };
    });
  };
  const addRow = () => onChange((tb) => ({ ...tb, rows: [...tb.rows, newRow()] }));
  const removeRow = (rid) => onChange((tb) => ({ ...tb, rows: tb.rows.filter((r) => r.id !== rid) }));
  const moveRow = (idx, dir) => onChange((tb) => ({ ...tb, rows: moveInArray(tb.rows, idx, dir) }));
  const setRowVat = (rid, val) => onChange((tb) => ({ ...tb, rows: tb.rows.map((r) => (r.id === rid ? { ...r, vatRate: val === '' ? undefined : Number(val) } : r)) }));

  const columns = table.columns || [];
  // Per-column width/type snapshot passed to the (compiler-memoised) rows so their
  // props stay stable across a selection change. `main` marks the hero text column
  // (dark, elastic); the rest render muted.
  const colMeta = columns.map((c) => {
    const main = c.id === firstTextId;
    const w = Number.isFinite(c.width) ? c.width : (COL_DEFAULT_W[c.type] || 100);
    return { id: c.id, type: c.type, main, width: main ? 'auto' : w, minWidth: main ? DESC_MIN_W : w };
  });
  const rows = table.rows || [];
  const tableRate = tableVatRate(table);
  const sumMode = sumsNumberCols(table);
  const computedAmount = sumMode || (columns.some((c) => c.type === 'qty') && columns.some((c) => c.type === 'price'));
  const hasVatCol = columns.some((c) => c.type === 'vat');
  const hasExclCol = columns.some((c) => c.type === 'amount_excl');
  // No automatic folding of long tables — every row is always shown. Collapsing
  // is a deliberate user action (select rows → group), rendered as a summary row.
  const shown = rows;
  // Build the ordered render list: each folded group emits an inline group-header
  // row at its first visible member; collapsed groups hide their members, expanded
  // groups render header + members. Group headers align to the same column grid.
  const memberGroup = new Map();
  groups.forEach((g) => g.rowIds.forEach((id) => memberGroup.set(id, g)));
  const displayItems = [];
  const seenGroup = new Set();
  shown.forEach((r) => {
    const g = memberGroup.get(r.id);
    if (g) {
      if (!seenGroup.has(g.id)) { seenGroup.add(g.id); displayItems.push({ type: 'group', g }); }
      if (g.expanded) displayItems.push({ type: 'row', r, member: true });
      return;
    }
    displayItems.push({ type: 'row', r });
  });
  const visibleDataRows = displayItems.filter((it) => it.type === 'row').map((it) => it.r);
  // Stable checkbox handler (reads the latest visible rows via a ref) so rows can
  // be memoised — shift extends the range, a plain click toggles.
  const visibleRowsRef = useRef([]);
  useEffect(() => { visibleRowsRef.current = visibleDataRows; });
  const onCheck = (rowId, visIdx, shift) => {
    if (shift && lastCheckIdx.current != null) {
      const [a, b] = [lastCheckIdx.current, visIdx].sort((x, y) => x - y);
      setSelected((prev) => { const n = new Set(prev); for (let k = a; k <= b; k += 1) { const rr = visibleRowsRef.current[k]; if (rr) n.add(rr.id); } return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); if (n.has(rowId)) n.delete(rowId); else n.add(rowId); return n; });
    }
    lastCheckIdx.current = visIdx;
  };
  // Precompute id→index maps so the row render loop is O(n), not O(n²).
  const visIndexById = new Map(visibleDataRows.map((r, i) => [r.id, i]));
  const rowIndexById = new Map(rows.map((r, i) => [r.id, i]));

  // One visual language for "collapsed rows": both a long-table auto-collapse and a
  // manual group render through this identical summary row — chevron + "N rows" in
  // the first column, the summed amount in the amount column, optional ⋮ menu.
  // Where the folded total lands: the amount column if there is one, otherwise the
  // last numeric column, otherwise inline next to the count so the sum is never lost.
  const NUMERIC = ['amount', 'number', 'amount_excl', 'vat', 'qty', 'price'];
  const sumColId = (columns.find((x) => x.type === 'amount')
    || [...columns].reverse().find((x) => NUMERIC.includes(x.type)))?.id;
  const summaryRow = ({ rowKey, count, sum, expanded: isOpen, onToggle, menuItems }) => (
    <tr key={rowKey} className="kalkyl-group-row" style={{ cursor: 'pointer' }} onClick={onToggle}>
      <td style={{ textAlign: 'center', padding: '2px' }}>
        <Button size="small" type="text" className="kalkyl-fold-toggle" icon={isOpen ? <DownOutlined /> : <RightOutlined />}
          onClick={(e) => { e.stopPropagation(); onToggle(); }} title={isOpen ? t('Collapse') : t('Expand')} style={{ color: '#687898' }} />
      </td>
      {columns.map((c, ci) => (
        <td key={c.id} style={{ padding: ci === 0 ? '2px 4px 2px 0' : '2px 4px', width: cellWidth(c), minWidth: cellMinWidth(c) }}>
          {ci === 0 ? (
            <span style={{ padding: '0 7px', fontWeight: 600, color: '#052d50' }}>
              {count} {t('rows')}
              {!sumColId ? <b style={{ marginLeft: 8, fontVariantNumeric: 'tabular-nums' }}>{formatAmount(sum)}</b> : null}
            </span>
          ) : c.id === sumColId ? (
            <div style={{ textAlign: 'right', padding: '2px 7px', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#052d50' }}>{formatAmount(sum)}</div>
          ) : null}
        </td>
      ))}
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
        {menuItems ? (
          <Dropdown trigger={['click']} placement="bottomRight" menu={{ items: menuItems }}>
            <Button size="small" type="text" icon={<MoreOutlined />} title={t('Group options')} />
          </Dropdown>
        ) : null}
      </td>
    </tr>
  );

  // Selected-rows tally (summed over ALL rows so a selection survives collapse).
  const selCount = rows.reduce((n, r) => (selected.has(r.id) ? n + 1 : n), 0);
  const selSum = rows.reduce((s, r) => (selected.has(r.id) ? s + lineAmount(table, r) : s), 0);

  // Keep the docked action bar aligned to THIS table's width/position (it renders
  // in a body-level portal so no ancestor overflow can clip it while scrolling).
  useEffect(() => {
    if (!selCount) { setBarBox(null); return undefined; }
    let raf = 0;
    // Coalesce scroll bursts into one rAF, and only setState when the box really
    // moved — otherwise every scroll frame would re-render all rows.
    const measure = () => {
      raf = 0;
      const el = cardRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setBarBox((prev) => (prev && Math.abs(prev.left - r.left) < 0.5 && Math.abs(prev.width - r.width) < 0.5
        ? prev : { left: r.left, width: r.width }));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll); };
  }, [selCount]);
  const allChecked = rows.length > 0 && selCount === rows.length;
  const someChecked = selCount > 0 && !allChecked;
  const toggleAll = (checked) => setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());

  // All table controls live in one settings popover so the header stays clean:
  // just the (editable) title + a gear.
  const settingsContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 240 }}>
      <div>
        <div className="planning-field-label">{t('VAT')}</div>
        <Select size="small" value={tableVatRate(table)} style={{ width: '100%' }}
          onChange={(v) => onChange((tb) => ({ ...tb, vatRate: v, vatMode: undefined }))}
          options={VAT_RATES.map((r) => ({ value: r, label: r === 0 ? t('Without VAT') : `${t('VAT')} ${r}%` }))} />
      </div>
      <div>
        <div className="planning-field-label">{t('How the Amount is entered')}</div>
        <Select size="small" value={table.amountInclVat !== false} style={{ width: '100%' }}
          onChange={(v) => onChange((tb) => ({ ...tb, amountInclVat: v }))}
          options={[
            { value: true, label: t('Amount incl. VAT') },
            { value: false, label: t('Amount excl. VAT') },
          ]} />
      </div>
      <div>
        <div className="planning-field-label">{t('Amount value')}</div>
        <Select size="small" value={Boolean(table.amountFromNumbers)} style={{ width: '100%' }}
          onChange={(v) => onChange((tb) => ({ ...tb, amountFromNumbers: v }))}
          options={[
            { value: false, label: t('Entered directly') },
            { value: true, label: t('Sum of the number columns') },
          ]} />
      </div>
      <div>
        <div className="planning-field-label">{t('Colour')}</div>
        <Select size="small" value={table.color} style={{ width: '100%' }}
          onChange={(v) => onChange((tb) => ({ ...tb, color: v }))}
          options={COLOR_KEYS.map((c) => ({ value: c, label: (<span><span style={{ color: KALKYL_COLORS[c].head }}>●</span> {t(c)}</span>) }))} />
      </div>
      <div style={{ borderTop: '1px solid #eef2f6', paddingTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {onImport ? <Button size="small" icon={<UploadOutlined />} onClick={onImport}>{t('Import Excel')}</Button> : null}
        {onImport ? <Button size="small" type="text" icon={<FileExcelOutlined />} title={t('Download import template')}
          onClick={() => downloadImportTemplate([t('Description'), t('Date'), t('Amount')])} /> : null}
      </div>
      {onToggleDetail ? (
        <div style={{ borderTop: '1px solid #eef2f6', paddingTop: 8 }}>
          <Button size="small" block icon={table.detail ? <AppstoreOutlined /> : <ProfileOutlined />} onClick={onToggleDetail}>
            {table.detail ? t('Move to Overview') : t('Move to detailed sheet')}
          </Button>
        </div>
      ) : null}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>
          <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={isFirst} onClick={() => onMove(-1)} title={t('Move up')} />
          <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={isLast} onClick={() => onMove(1)} title={t('Move down')} />
        </span>
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onRemove}>{t('Delete')}</Button>
      </div>
    </div>
  );

  return (
    <div
      ref={cardRef}
      style={{ background: palette.bg, borderRadius: 10, marginBottom: 16, overflow: 'hidden', border: dragOver ? '2px dashed #0785f4' : '1px solid rgba(0,0,0,0.06)', position: 'relative' }}
      onDragOver={onScanFiles ? (e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setDragOver(true); } } : undefined}
      onDragLeave={onScanFiles ? (e) => { if (e.currentTarget === e.target) setDragOver(false); } : undefined}
      onDrop={onScanFiles ? (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer?.files?.length) onScanFiles(e.dataTransfer.files); } : undefined}
    >
      {dragOver ? (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'rgba(7,133,244,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', fontWeight: 600, color: '#0785f4' }}>
          {t('Drop receipts/invoices to add rows')}
        </div>
      ) : null}
      {/* Lighter strip + a left accent in the saturated head colour, so the table
          header sits a level BELOW the page's tab bar instead of competing. */}
      <div style={{ background: palette.bg, boxShadow: `inset 3px 0 0 ${palette.head}`, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button size="small" type="text" icon={folded ? <RightOutlined style={{ fontSize: 11 }} /> : <DownOutlined style={{ fontSize: 11 }} />}
          onClick={() => setFolded((f) => !f)} title={folded ? t('Expand') : t('Collapse')}
          style={{ width: 22, height: 22, minWidth: 22, padding: 0 }} />
        <span className="kalkyl-editable" style={{ flex: 1, minWidth: 130, display: 'flex' }} title={t('Click to rename')}>
          <Input value={table.title} onChange={(e) => onChange((tb) => ({ ...tb, title: e.target.value }))}
            variant="borderless" style={{ fontWeight: 600, flex: 1, background: 'transparent', paddingInlineStart: 4, color: '#052d50' }} />
        </span>
        {folded ? <span style={{ fontWeight: 700, marginRight: 6, fontVariantNumeric: 'tabular-nums' }}>{money(tt.brutto)}</span> : null}
        {onScan ? <Button size="small" type="text" icon={<ScanOutlined />} onClick={onScan} title={t('Scan receipt into a row')} /> : null}
        <Popover trigger="click" placement="bottomRight" content={settingsContent} title={t('Table settings')}>
          <Button size="small" type="text" icon={<SettingOutlined />} title={t('Table settings')} />
        </Popover>
        {/* Delete lives in the same icon row as scan/settings — same size, glyph
            family and colour as its neighbours. */}
        <Button size="small" type="text" icon={<DeleteOutlined />} onClick={onRemove} title={t('Delete table')} />
      </div>

      {folded ? null : (
      // Reserve space at the bottom while the docked bar is up so it never covers
      // the last rows — the content effectively shifts up.
      <div style={{ padding: '6px 10px 10px 10px', paddingBottom: selCount > 0 ? 78 : 10, background: '#fff' }}>
        {/* Selecting rows raises an action bar docked to the bottom of the viewport,
            spanning this table's full width and tinted with the table's header
            colour. Rendered in a body-level portal so ancestor overflow can't clip
            it; a scroll/resize listener keeps it aligned to the table. */}
        {selCount > 0 && typeof document !== 'undefined' && barBox ? createPortal(
          <div className="kalkyl-dockbar" style={{ position: 'fixed', bottom: 14, left: barBox.left, width: barBox.width, zIndex: 1000, padding: '0 4px', pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 14, background: '#2683f9', color: '#fff', borderRadius: 10, padding: '11px 16px', boxShadow: '0 8px 24px rgba(5,45,80,0.25)', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontWeight: 700 }}>{t('Selected')} ({selCount})</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', opacity: 0.5 }} />
              <b style={{ fontWeight: 700 }}>{money(selSum)}</b>
              <span style={{ flex: 1 }} />
              <button type="button" onClick={collapseSelected} style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,0.9)', cursor: 'pointer', font: 'inherit', fontWeight: 600, padding: '8px 6px' }}>{t('Collapse')}</button>
              {onExtractRows ? (
                <Dropdown trigger={['click']} placement="topRight" menu={{ items: [
                  { key: 'new', icon: <PlusOutlined />, label: t('New table'), onClick: () => setNewTableName('') },
                  ...(moveTargets.length ? [
                    { type: 'divider' },
                    ...moveTargets.map((mt) => ({
                      key: mt.id,
                      label: (<span><span style={{ color: (KALKYL_COLORS[mt.color] || KALKYL_COLORS.grey).head }}>●</span> {mt.title || t('Untitled')}</span>),
                      onClick: () => exportSelected(mt.id),
                    })),
                  ] : []),
                ] }}>
                  <button type="button" style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 8, height: 36, padding: '0 14px', cursor: 'pointer', font: 'inherit', fontWeight: 600 }}>{t('Move to table')} ▾</button>
                </Dropdown>
              ) : null}
              <CloseOutlined onClick={() => setSelected(new Set())} title={t('Clear selection')} style={{ cursor: 'pointer', fontSize: 14, color: 'rgba(255,255,255,0.9)' }} />
            </div>
          </div>, document.body) : null}
        <Modal open={newTableName !== null} title={t('New table')} okText={t('Create')} cancelText={t('Cancel')}
          onOk={confirmNewTable} onCancel={() => setNewTableName(null)} destroyOnClose>
          <Input autoFocus value={newTableName || ''} placeholder={t('Table name')}
            onChange={(e) => setNewTableName(e.target.value)} onPressEnter={confirmNewTable} />
        </Modal>
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={{ width: 28, padding: '4px 2px', textAlign: 'center' }}>
                <Checkbox
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={(e) => toggleAll(e.target.checked)}
                  title={t('Select all')}
                />
              </th>
              {columns.map((c, ci) => {
                const rightAligned = (c.type === 'amount' || c.type === 'number' || c.type === 'amount_excl' || c.type === 'vat');
                // Any column can be removed (down to the last one). Removing the
                // amount/qty/price column just zeroes the totals — the user's call.
                const canRemove = columns.length > 1;
                return (
                  <th
                    key={c.id}
                    className="kalkyl-th"
                    style={{ position: 'relative', padding: ci === 0 ? '4px 4px 4px 0' : '4px 4px', paddingRight: rightAligned ? 8 : undefined, width: cellWidth(c), minWidth: cellMinWidth(c), whiteSpace: 'nowrap', textAlign: rightAligned ? 'right' : 'left' }}
                  >
                    {/* Name + a single ⋮ that holds every column action, like the
                        row menu — no cramped icon row. */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: rightAligned ? 'row-reverse' : 'row' }}>
                      <Input value={c.label} onChange={(e) => setCol(c.id, { label: e.target.value })}
                        variant="borderless" size="small" style={{ fontWeight: 500, fontSize: 11, padding: '0 7px', width: '100%', textAlign: rightAligned ? 'right' : 'left', color: c.type === 'amount' ? '#052d50' : '#687898' }} />
                      {sort?.colId === c.id ? (
                        sort.dir === 'asc'
                          ? <CaretUpOutlined className="kalkyl-col-icon" style={{ color: 'var(--primary-color,#0785f4)', fontSize: 10 }} />
                          : <CaretDownOutlined className="kalkyl-col-icon" style={{ color: 'var(--primary-color,#0785f4)', fontSize: 10 }} />
                      ) : null}
                      <Dropdown
                        trigger={['click']}
                        placement="bottomRight"
                        menu={{ items: [
                          { key: 'asc', icon: <CaretUpOutlined />, label: t('Sort ascending'), onClick: () => applySort(c, 'asc') },
                          { key: 'desc', icon: <CaretDownOutlined />, label: t('Sort descending'), onClick: () => applySort(c, 'desc') },
                          { type: 'divider' },
                          (() => {
                            const distinct = Array.from(new Set((rows || []).map((r) => String(r.cells?.[c.id] ?? '').trim()).filter(Boolean))).slice(0, 40);
                            return distinct.length ? {
                              key: 'select', icon: <CheckSquareOutlined />, label: t('Select by value'),
                              children: distinct.map((v, k) => ({ key: `sv${k}`, label: v, onClick: () => selectByValue(c, v) })),
                            } : null;
                          })(),
                          { type: 'divider' },
                          // Flattened: two direct "Insert left/right" submenus instead of
                          // Insert → left/right → types (one less level to navigate).
                          { key: 'insL', icon: <PlusOutlined />, label: t('Insert column left'), children: colTypeItems(ci, 'L') },
                          { key: 'insR', icon: <PlusOutlined />, label: t('Insert column right'), children: colTypeItems(ci + 1, 'R') },
                          { type: 'divider' },
                          { key: 'left', icon: <ArrowUpOutlined rotate={-90} />, label: t('Move left'), disabled: ci === 0, onClick: () => moveColumn(ci, ci - 1) },
                          { key: 'right', icon: <ArrowDownOutlined rotate={-90} />, label: t('Move right'), disabled: ci === columns.length - 1, onClick: () => moveColumn(ci, ci + 1) },
                          ...(canRemove ? [{ type: 'divider' }, { key: 'remove', danger: true, icon: <CloseOutlined />, label: t('Remove column'), onClick: () => removeCol(c.id) }] : []),
                        ].filter(Boolean) }}
                      >
                        <MoreOutlined className="kalkyl-col-menu kalkyl-col-icon" title={t('Column options')} style={{ cursor: 'pointer' }} />
                      </Dropdown>
                    </div>
                    {isMainDesc(c) ? null : (
                      <span className="kalkyl-col-resize" onMouseDown={(e) => startResize(e, c)} title={t('Drag to resize')} />
                    )}
                  </th>
                );
              })}
              <th style={{ width: 40, textAlign: 'right' }}>
                <Dropdown trigger={['click']} placement="bottomRight" menu={{ items: [
                  { key: 'text', label: t('Text'), onClick: () => addCol('text') },
                  { key: 'number', label: t('Number'), onClick: () => addCol('number') },
                  // Single-instance columns — disabled once already present.
                  { key: 'date', label: t('Date'), disabled: columns.some((c) => c.type === 'date'), onClick: () => addCol('date') },
                  { key: 'vat', label: t('VAT'), disabled: columns.some((c) => c.type === 'vat'), onClick: () => addCol('vat') },
                  { key: 'amount_excl', label: t('excl. VAT'), disabled: columns.some((c) => c.type === 'amount_excl'), onClick: () => addCol('amount_excl') },
                ] }}>
                  <Button size="small" type="text" icon={<PlusOutlined />} title={t('Add column')} />
                </Dropdown>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((it) => {
                if (it.type === 'group') {
                  const g = it.g;
                  const gr = (table.rows || []).filter((x) => g.rowIds.has(x.id));
                  const gsum = gr.reduce((s, x) => s + lineAmount(table, x), 0);
                  return summaryRow({
                    rowKey: g.id,
                    count: gr.length,
                    sum: gsum,
                    expanded: g.expanded,
                    onToggle: () => toggleGroup(g.id),
                    menuItems: [{ key: 'ungroup', icon: <CloseOutlined />, label: t('Ungroup'), onClick: () => ungroup(g.id) }],
                  });
                }
                const r = it.r;
                const idx = rowIndexById.get(r.id);
                // Precompute the read-only cells as plain strings so the row never
                // needs the whole `table` — keeps memoised rows isolated from each
                // other on add/edit. Cheap: only runs for tables that have these
                // columns (a bank import has none of them).
                return (
                  <KalkylRow
                    key={r.id}
                    row={r}
                    member={Boolean(it.member)}
                    isSelected={selected.has(r.id)}
                    visIndex={visIndexById.get(r.id)}
                    rowIndex={idx}
                    isLast={idx === rows.length - 1}
                    selectionActive={selCount > 0}
                    colMeta={colMeta}
                    vatText={hasVatCol ? formatAmount(lineVat(table, r)) : null}
                    netText={hasExclCol ? formatAmount(lineNet(table, r)) : null}
                    amountText={computedAmount ? formatAmount(lineAmount(table, r)) : null}
                    tableRate={tableRate}
                    t={t}
                    onCheck={onCheck}
                    setCell={setCell}
                    setRowVat={setRowVat}
                    moveRow={moveRow}
                    removeRow={removeRow}
                  />
                );
              })}
          </tbody>
        </table>
        </div>

        {/* Full-width "+ Add row" strip (Airtable/Notion idiom) — a big, familiar
            target for the most frequent action. */}
        <button type="button" className="kalkyl-addrow-strip" onClick={addRow}>
          <PlusOutlined /> {t('Add row')}
        </button>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <span style={{ display: 'flex', gap: 16, alignItems: 'baseline', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: '#687898', fontSize: 12 }}>
              {t('Excl. VAT')} <b style={{ color: 'inherit' }}>{money(tt.netto)}</b>
            </span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#052d50' }}>
              {t('Incl. VAT')} {money(tt.brutto)}
            </span>
          </span>
        </div>
      </div>
      )}
    </div>
  );
}
