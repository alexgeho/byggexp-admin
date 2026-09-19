'use client';

import { useState } from 'react';
import { Button, Checkbox, Dropdown, Input, Popover, Select } from 'antd';
import {
  AppstoreOutlined, ArrowUpOutlined, ArrowDownOutlined, CaretUpOutlined, CaretDownOutlined, CloseOutlined, DeleteOutlined, DownOutlined, RightOutlined,
  FileExcelOutlined, MoreOutlined, PlusOutlined, ProfileOutlined, ScanOutlined, SettingOutlined, UploadOutlined,
} from '@ant-design/icons';
import { formatAmount } from '@/src/utils/formatCurrency';
import {
  KALKYL_COLORS, COLOR_KEYS, VAT_RATES, newColumn, newRow, moveInArray,
  tableTotals, lineAmount, lineNet, lineVat, tableVatRate, dateLabel, sumsNumberCols,
} from '@/src/features/projektkalkyl/kalkylModel';
import { evalFormula, COLLAPSE_AT, insertColumn } from '@/src/features/projektkalkyl/kalkylTableUtils';
import { downloadImportTemplate } from '@/src/features/projektkalkyl/excelImport';

// A number cell that doubles as a mini formula field: type a number OR an
// arithmetic expression ("2+2", "=10*3", "(1200+300)*1.25") and it computes on
// blur/Enter, like a spreadsheet cell. Shows the grouped number when idle, the
// raw text/formula while editing.
function NumCell({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const display = value === null || value === undefined || value === '' ? '' : formatAmount(value);
  const commit = () => {
    setEditing(false);
    onChange(evalFormula(text));
  };
  return (
    <Input
      size="small"
      style={{ width: '100%', textAlign: 'right' }}
      value={editing ? text : display}
      onFocus={() => { setEditing(true); setText(value === null || value === undefined ? '' : String(value)); }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onPressEnter={(e) => e.currentTarget.blur()}
    />
  );
}

// Per-type default column widths (px); all >= MIN_COL_W so a fresh column is
// usable, and no column can be dragged below the minimum.
const MIN_COL_W = 70;
const DESC_MIN_W = 90; // the elastic Description column never shrinks below this
const COL_DEFAULT_W = { text: 240, date: 132, amount: 90, number: 96, qty: 88, price: 96, vat: 72, amount_excl: 100 };

export default function KalkylTable({ money, t, table, isFirst, isLast, onChange, onMove, onRemove, onImport, onScan, onScanFiles, onToggleDetail, startFolded = false }) {
  const [expanded, setExpanded] = useState(false);
  const [folded, setFolded] = useState(Boolean(startFolded));
  const [dragOver, setDragOver] = useState(false);
  const [sort, setSort] = useState(null); // { colId, dir: 'asc' | 'desc' }
  // Row selection — lets the user tick a few rows and see their combined sum
  // (e.g. one worker's salary lines across months). Purely a view helper.
  const [selected, setSelected] = useState(() => new Set());
  const toggleRow = (rid) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(rid)) next.delete(rid); else next.add(rid);
    return next;
  });
  const palette = KALKYL_COLORS[table.color] || KALKYL_COLORS.grey;
  const tt = tableTotals(table);

  const setCol = (cid, patch) => onChange((tb) => ({ ...tb, columns: tb.columns.map((c) => (c.id === cid ? { ...c, ...patch } : c)) }));
  // The primary Description column flexes to fill and SHRINKS first, so the table
  // never overflows to the right — every other column holds its width. A user-set
  // width wins; otherwise a per-type default (all >= the 70px minimum). Description
  // isn't drag-resized (it's the elastic one); its default is only a floor.
  const firstTextId = (table.columns || []).find((c) => c.type === 'text')?.id;
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
  const rows = table.rows || [];
  const tableRate = tableVatRate(table);
  const chk = (on) => (on ? '✓ ' : ''); // tick the active VAT choice in the row menu
  const sumMode = sumsNumberCols(table);
  const computedAmount = sumMode || (columns.some((c) => c.type === 'qty') && columns.some((c) => c.type === 'price'));
  const collapsed = rows.length > COLLAPSE_AT && !expanded;
  const shown = collapsed ? rows.slice(-10) : rows;
  const offset = rows.length - shown.length;

  // Selected-rows tally (summed over ALL rows so a selection survives collapse).
  const selCount = rows.reduce((n, r) => (selected.has(r.id) ? n + 1 : n), 0);
  const selSum = rows.reduce((s, r) => (selected.has(r.id) ? s + lineAmount(table, r) : s), 0);
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
      <div style={{ background: palette.head, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Button size="small" type="text" icon={folded ? <RightOutlined /> : <DownOutlined />}
          onClick={() => setFolded((f) => !f)} title={folded ? t('Expand') : t('Collapse')} />
        <span className="kalkyl-editable" style={{ flex: 1, minWidth: 130, display: 'flex' }} title={t('Click to rename')}>
          <Input value={table.title} onChange={(e) => onChange((tb) => ({ ...tb, title: e.target.value }))}
            variant="borderless" style={{ fontWeight: 700, flex: 1, background: 'transparent' }} />
        </span>
        {folded ? <span style={{ fontWeight: 700, marginRight: 6, fontVariantNumeric: 'tabular-nums' }}>{money(tt.brutto)}</span> : null}
        {onScan ? <Button size="small" type="text" icon={<ScanOutlined />} onClick={onScan} title={t('Scan receipt into a row')} /> : null}
        <Popover trigger="click" placement="bottomRight" content={settingsContent} title={t('Table settings')}>
          <Button size="small" type="text" icon={<SettingOutlined />} title={t('Table settings')} />
        </Popover>
        <Button size="small" type="text" icon={<CloseOutlined style={{ fontSize: 12, color: 'var(--muted,#64748b)' }} />} title={t('Delete table')} onClick={onRemove} />
      </div>

      {folded ? null : (
      <div style={{ overflowX: 'auto', padding: '6px 10px 10px 10px' }}>
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
                        variant="borderless" size="small" style={{ fontWeight: 500, fontSize: 11, padding: '0 7px', width: '100%', textAlign: rightAligned ? 'right' : 'left', color: 'var(--muted,#64748b)' }} />
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
                          { key: 'left', icon: <ArrowUpOutlined rotate={-90} />, label: t('Move left'), disabled: ci === 0, onClick: () => moveColumn(ci, ci - 1) },
                          { key: 'right', icon: <ArrowDownOutlined rotate={-90} />, label: t('Move right'), disabled: ci === columns.length - 1, onClick: () => moveColumn(ci, ci + 1) },
                          ...(canRemove ? [{ type: 'divider' }, { key: 'remove', danger: true, icon: <CloseOutlined />, label: t('Remove column'), onClick: () => removeCol(c.id) }] : []),
                        ] }}
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
            {collapsed ? (
              <tr>
                <td colSpan={columns.length + 2} style={{ padding: '4px' }}>
                  <Button size="small" type="link" onClick={() => setExpanded(true)}>
                    {t('Show all')} ({rows.length})
                  </Button>
                </td>
              </tr>
            ) : null}
            {shown.map((r, i) => {
              const idx = offset + i;
              return (
                <tr key={r.id} className={selected.has(r.id) ? 'kalkyl-row--selected' : undefined}>
                  <td style={{ textAlign: 'center', padding: '2px' }}>
                    <Checkbox checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} />
                  </td>
                  {columns.map((c, ci) => (
                    <td key={c.id} style={{ padding: ci === 0 ? '2px 4px 2px 0' : '2px 4px', width: cellWidth(c), minWidth: cellMinWidth(c) }}>
                      {c.type === 'vat' ? (
                        <div style={{ textAlign: 'right', padding: '2px 7px', fontVariantNumeric: 'tabular-nums', color: 'var(--muted,#64748b)' }}>
                          {formatAmount(lineVat(table, r))}
                        </div>
                      ) : c.type === 'amount_excl' ? (
                        <div style={{ textAlign: 'right', padding: '2px 7px', fontVariantNumeric: 'tabular-nums', color: 'var(--muted,#64748b)' }}>
                          {formatAmount(lineNet(table, r))}
                        </div>
                      ) : c.type === 'amount' && computedAmount ? (
                        <div style={{ textAlign: 'right', padding: '2px 7px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {formatAmount(lineAmount(table, r))}
                        </div>
                      ) : (c.type === 'amount' || c.type === 'qty' || c.type === 'price' || c.type === 'number') ? (
                        <NumCell value={r.cells?.[c.id]} onChange={(v) => setCell(r.id, c.id, v)} />
                      ) : (
                        <Input value={r.cells?.[c.id] || ''} onChange={(e) => setCell(r.id, c.id, e.target.value)}
                          placeholder={c.type === 'date' ? 'yyyy-mm-dd' : ''} size="small" style={{ width: '100%' }} />
                      )}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Dropdown trigger={['click']} placement="bottomRight" menu={{ items: [
                      { key: 'vat', label: t('VAT'), children: [
                        { key: 'inherit', label: `${chk(!Number.isFinite(r.vatRate))}${t('Default')} (${tableRate === 0 ? '0%' : `${tableRate}%`})`, onClick: () => setRowVat(r.id, '') },
                        ...VAT_RATES.map((rt) => ({ key: `v${rt}`, label: `${chk(r.vatRate === rt)}${rt === 0 ? t('Without VAT') : `${rt}%`}`, onClick: () => setRowVat(r.id, rt) })),
                      ] },
                      { type: 'divider' },
                      { key: 'up', label: t('Move up'), icon: <ArrowUpOutlined />, disabled: idx === 0 || (collapsed && i === 0), onClick: () => moveRow(idx, -1) },
                      { key: 'down', label: t('Move down'), icon: <ArrowDownOutlined />, disabled: idx === rows.length - 1, onClick: () => moveRow(idx, 1) },
                      { type: 'divider' },
                      { key: 'del', label: t('Delete'), icon: <DeleteOutlined />, danger: true, onClick: () => removeRow(r.id) },
                    ] }}>
                      <Button size="small" type="text" icon={<MoreOutlined />} title={t('Row options')} />
                    </Dropdown>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span>
            <Button size="small" icon={<PlusOutlined />} onClick={addRow}>{t('Add row')}</Button>
            {rows.length > COLLAPSE_AT && expanded ? (
              <Button size="small" type="link" onClick={() => setExpanded(false)}>{t('Collapse')}</Button>
            ) : null}
          </span>
          <span style={{ display: 'flex', gap: 16, alignItems: 'baseline', fontVariantNumeric: 'tabular-nums' }}>
            {selCount > 0 ? (
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'baseline', padding: '2px 10px', borderRadius: 6, background: palette.head, fontWeight: 700 }}>
                <span style={{ fontWeight: 500, fontSize: 12 }}>{t('Selected')} ({selCount})</span>
                {money(selSum)}
                <Button size="small" type="text" icon={<CloseOutlined style={{ fontSize: 10 }} />} onClick={() => setSelected(new Set())} title={t('Clear selection')} />
              </span>
            ) : null}
            <span style={{ color: 'var(--muted,#64748b)', fontSize: 12 }}>
              {t('Excl. VAT')} <b style={{ color: 'inherit' }}>{money(tt.netto)}</b>
            </span>
            <span style={{ fontWeight: 700 }}>
              {t('Incl. VAT')} {money(tt.brutto)}
            </span>
          </span>
        </div>
      </div>
      )}
    </div>
  );
}
