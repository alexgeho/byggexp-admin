'use client';

import { useState } from 'react';
import { Button, Dropdown, Input, InputNumber, Popover, Select } from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, CloseOutlined, DeleteOutlined, DownOutlined, RightOutlined,
  FileExcelOutlined, MoreOutlined, PlusOutlined, ScanOutlined, SettingOutlined, UploadOutlined,
} from '@ant-design/icons';
import { formatAmount } from '@/src/utils/formatCurrency';
import {
  KALKYL_COLORS, COLOR_KEYS, VAT_RATES, newColumn, newRow, moveInArray,
  tableTotals, lineAmount, lineNet, lineVat, tableVatRate, dateLabel,
} from '@/src/features/projektkalkyl/kalkylModel';
import { amountFmt, amountParse, COLLAPSE_AT, COL_W, insertColumn } from '@/src/features/projektkalkyl/kalkylTableUtils';
import { downloadImportTemplate } from '@/src/features/projektkalkyl/excelImport';

export default function KalkylTable({ money, t, table, isFirst, isLast, onChange, onMove, onRemove, onImport, onScan, onScanFiles }) {
  const [expanded, setExpanded] = useState(false);
  const [folded, setFolded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const palette = KALKYL_COLORS[table.color] || KALKYL_COLORS.grey;
  const tt = tableTotals(table);

  const setCol = (cid, patch) => onChange((tb) => ({ ...tb, columns: tb.columns.map((c) => (c.id === cid ? { ...c, ...patch } : c)) }));
  const colLabelFor = (type) => (type === 'date' ? dateLabel(t, table.side) : type === 'number' ? t('Number') : type === 'amount_excl' ? t('excl. VAT') : type === 'vat' ? t('VAT') : t('Text'));
  const addCol = (type = 'text') => onChange((tb) => ({ ...tb, columns: insertColumn(tb.columns || [], newColumn(colLabelFor(type), type)) }));
  const removeCol = (cid) => onChange((tb) => ({ ...tb, columns: (tb.columns || []).filter((c) => c.id !== cid) }));
  const setCell = (rid, cid, val) => onChange((tb) => ({ ...tb, rows: tb.rows.map((r) => (r.id === rid ? { ...r, cells: { ...r.cells, [cid]: val } } : r)) }));
  const addRow = () => onChange((tb) => ({ ...tb, rows: [...tb.rows, newRow()] }));
  const removeRow = (rid) => onChange((tb) => ({ ...tb, rows: tb.rows.filter((r) => r.id !== rid) }));
  const moveRow = (idx, dir) => onChange((tb) => ({ ...tb, rows: moveInArray(tb.rows, idx, dir) }));
  const setRowVat = (rid, val) => onChange((tb) => ({ ...tb, rows: tb.rows.map((r) => (r.id === rid ? { ...r, vatRate: val === '' ? undefined : Number(val) } : r)) }));

  const columns = table.columns || [];
  const rows = table.rows || [];
  const tableRate = tableVatRate(table);
  const chk = (on) => (on ? '✓ ' : ''); // tick the active VAT choice in the row menu
  const computedAmount = columns.some((c) => c.type === 'qty') && columns.some((c) => c.type === 'price');
  const collapsed = rows.length > COLLAPSE_AT && !expanded;
  const shown = collapsed ? rows.slice(-10) : rows;
  const offset = rows.length - shown.length;

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
      </div>

      {folded ? null : (
      <div style={{ overflowX: 'auto', padding: '6px 10px 10px 10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'auto' }}>
          <thead>
            <tr>
              {columns.map((c, ci) => {
                const rightAligned = (c.type === 'amount' || c.type === 'number' || c.type === 'amount_excl' || c.type === 'vat');
                // Keep Description + Amount, and the qty/price pair that drives a
                // computed Amount (removing one silently zeroes the totals).
                const canRemove = !['amount', 'text', 'qty', 'price'].includes(c.type);
                return (
                  <th key={c.id} className="kalkyl-th" style={{ padding: ci === 0 ? '4px 4px 4px 0' : '4px 4px', paddingRight: rightAligned ? 8 : undefined, width: c.type === 'text' ? '100%' : COL_W[c.type], whiteSpace: c.type === 'text' ? undefined : 'nowrap', textAlign: rightAligned ? 'right' : 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Input value={c.label} onChange={(e) => setCol(c.id, { label: e.target.value })}
                        variant="borderless" size="small" style={{ fontWeight: 500, fontSize: 11, padding: '0 2px', width: '100%', textAlign: rightAligned ? 'right' : 'left', color: 'var(--muted,#64748b)' }} />
                      {canRemove ? (
                        <Button className="kalkyl-col-menu" size="small" type="text" icon={<CloseOutlined style={{ fontSize: 10 }} />} title={t('Remove column')} onClick={() => removeCol(c.id)} />
                      ) : null}
                    </div>
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
                <td colSpan={columns.length + 1} style={{ padding: '4px' }}>
                  <Button size="small" type="link" onClick={() => setExpanded(true)}>
                    {t('Show all')} ({rows.length})
                  </Button>
                </td>
              </tr>
            ) : null}
            {shown.map((r, i) => {
              const idx = offset + i;
              return (
                <tr key={r.id}>
                  {columns.map((c, ci) => (
                    <td key={c.id} style={{ padding: ci === 0 ? '2px 4px 2px 0' : '2px 4px', width: c.type === 'text' ? '100%' : COL_W[c.type] }}>
                      {c.type === 'vat' ? (
                        <div style={{ textAlign: 'right', padding: '2px 8px', minWidth: COL_W.vat, fontVariantNumeric: 'tabular-nums', color: 'var(--muted,#64748b)' }}>
                          {formatAmount(lineVat(table, r))}
                        </div>
                      ) : c.type === 'amount_excl' ? (
                        <div style={{ textAlign: 'right', padding: '2px 8px', minWidth: COL_W.amount_excl, fontVariantNumeric: 'tabular-nums', color: 'var(--muted,#64748b)' }}>
                          {formatAmount(lineNet(table, r))}
                        </div>
                      ) : c.type === 'amount' && computedAmount ? (
                        <div style={{ textAlign: 'right', padding: '2px 8px', minWidth: COL_W.amount, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {formatAmount(lineAmount(table, r))}
                        </div>
                      ) : (c.type === 'amount' || c.type === 'qty' || c.type === 'price' || c.type === 'number') ? (
                        <InputNumber size="small" value={r.cells?.[c.id]} onChange={(v) => setCell(r.id, c.id, v)}
                          controls={false} style={{ width: '100%', minWidth: COL_W[c.type], textAlign: 'right' }} formatter={amountFmt} parser={amountParse} />
                      ) : (
                        <Input value={r.cells?.[c.id] || ''} onChange={(e) => setCell(r.id, c.id, e.target.value)}
                          placeholder={c.type === 'date' ? 'yyyy-mm-dd' : ''} size="small"
                          style={c.type === 'text' ? { width: '100%' } : { minWidth: COL_W[c.type] }} />
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
