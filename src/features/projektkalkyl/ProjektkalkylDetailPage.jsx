'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Input, InputNumber, Select, message } from 'antd';
import {
  ArrowLeftOutlined, ArrowUpOutlined, ArrowDownOutlined,
  DeleteOutlined, PlusOutlined, SaveOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, useParams } from '@/src/shared/routing/routerCompat';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatSek } from '@/src/utils/formatCurrency';
import { useProjektkalkylStore } from '@/src/store/projektkalkylStore';
import {
  KALKYL_COLORS, COLOR_KEYS, newColumn, newRow, newTable, presetTables,
  tableTotals, sideTotals, moveInArray,
} from '@/src/features/projektkalkyl/kalkylModel';

const amountFmt = (v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const amountParse = (v) => (v || '').replace(/\s/g, '');

export default function ProjektkalkylDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { fetchOne, update } = useProjektkalkylStore();

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const k = await fetchOne(id);
        if (!alive) return;
        setName(k.name || '');
        setNote(k.note || '');
        // Fresh/empty calc → seed with the preset starter tables (unsaved until Save).
        setTables(Array.isArray(k.tables) && k.tables.length ? k.tables : presetTables(t));
      } catch {
        message.error(t('Could not load the calculation'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const incomeTotals = useMemo(() => sideTotals(tables, 'income'), [tables]);
  const expenseTotals = useMemo(() => sideTotals(tables, 'expense'), [tables]);
  const result = incomeTotals.brutto - expenseTotals.brutto;

  const patchTable = (tid, updater) =>
    setTables((ts) => ts.map((tb) => (tb.id === tid ? updater(tb) : tb)));
  const addTable = (side) => setTables((ts) => [...ts, newTable(side, t)]);
  const removeTable = (tid) => setTables((ts) => ts.filter((tb) => tb.id !== tid));
  const moveTable = (tid, dir) =>
    setTables((ts) => {
      const side = ts.find((x) => x.id === tid)?.side;
      const sideItems = ts.filter((x) => x.side === side);
      const idx = sideItems.findIndex((x) => x.id === tid);
      const reordered = moveInArray(sideItems, idx, dir);
      // Rebuild the full list, keeping the other side in place.
      const others = ts.filter((x) => x.side !== side);
      return side === 'income' ? [...reordered, ...others] : [...others, ...reordered];
    });

  const save = async () => {
    setSaving(true);
    try {
      await update(id, { name, note, tables });
      message.success(t('Saved'));
    } catch { /* store shows error */ } finally { setSaving(false); }
  };

  const goBack = () => navigate(pathname.replace(/\/[^/]+$/, ''));

  if (loading) return <div style={{ padding: 24 }}>{t('Loading…')}</div>;

  const incomeTables = tables.filter((x) => x.side === 'income');
  const expenseTables = tables.filter((x) => x.side === 'expense');

  return (
    <div className="projektkalkyl">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={goBack}>{t('Back')}</Button>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Name')}
          style={{ maxWidth: 340, fontWeight: 600, fontSize: 16 }} />
        <span style={{ fontSize: 13, color: 'var(--muted, #64748b)' }}>
          {t('Result')}: <b style={{ color: result < 0 ? '#e5484d' : '#16a35f' }}>{formatSek(result)}</b>
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>{t('Save')}</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Side
          t={t} title={t('Income')} side="income" tables={incomeTables} totals={incomeTotals}
          totalColor="#16a35f" patchTable={patchTable} moveTable={moveTable} removeTable={removeTable}
          onAdd={() => addTable('income')}
        />
        <Side
          t={t} title={t('Expenses')} side="expense" tables={expenseTables} totals={expenseTotals}
          totalColor="#e5484d" patchTable={patchTable} moveTable={moveTable} removeTable={removeTable}
          onAdd={() => addTable('expense')}
        />
      </div>

      <div style={{ marginTop: 24, maxWidth: 640 }}>
        <label style={{ fontSize: 13, color: 'var(--muted, #64748b)' }}>{t('Note')}</label>
        <Input.TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ marginTop: 6 }} />
      </div>
    </div>
  );
}

function Side({ t, title, tables, totals, totalColor, patchTable, moveTable, removeTable, onAdd }) {
  return (
    <div style={{ flex: '1 1 460px', minWidth: 320 }}>
      <h3 style={{ margin: '0 0 12px' }}>{title}</h3>
      {tables.map((tb, i) => (
        <KalkylTable
          key={tb.id} t={t} table={tb} isFirst={i === 0} isLast={i === tables.length - 1}
          onChange={(u) => patchTable(tb.id, u)} onMove={(d) => moveTable(tb.id, d)} onRemove={() => removeTable(tb.id)}
        />
      ))}
      <Button icon={<PlusOutlined />} onClick={onAdd} style={{ marginBottom: 16 }}>{t('Add table')}</Button>

      <div style={{ background: totalColor, color: '#fff', borderRadius: 10, padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
        <span>TOTAL</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatSek(totals.brutto)}
          {totals.vat > 0 ? <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.9, marginLeft: 8 }}>
            ({t('excl.')} {formatSek(totals.netto)} + {t('VAT')} {formatSek(totals.vat)})</span> : null}
        </span>
      </div>
    </div>
  );
}

function KalkylTable({ t, table, isFirst, isLast, onChange, onMove, onRemove }) {
  const palette = KALKYL_COLORS[table.color] || KALKYL_COLORS.grey;
  const tt = tableTotals(table);

  const setCol = (cid, patch) => onChange((tb) => ({ ...tb, columns: tb.columns.map((c) => (c.id === cid ? { ...c, ...patch } : c)) }));
  const addCol = () => onChange((tb) => ({ ...tb, columns: [...tb.columns, newColumn(t('Column'), 'text')] }));
  const removeCol = (cid) => onChange((tb) => ({ ...tb, columns: tb.columns.filter((c) => c.id !== cid) }));
  const setCell = (rid, cid, val) => onChange((tb) => ({ ...tb, rows: tb.rows.map((r) => (r.id === rid ? { ...r, cells: { ...r.cells, [cid]: val } } : r)) }));
  const addRow = () => onChange((tb) => ({ ...tb, rows: [...tb.rows, newRow()] }));
  const removeRow = (rid) => onChange((tb) => ({ ...tb, rows: tb.rows.filter((r) => r.id !== rid) }));
  const moveRow = (idx, dir) => onChange((tb) => ({ ...tb, rows: moveInArray(tb.rows, idx, dir) }));

  return (
    <div style={{ background: palette.bg, borderRadius: 10, marginBottom: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ background: palette.head, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Input value={table.title} onChange={(e) => onChange((tb) => ({ ...tb, title: e.target.value }))}
          variant="borderless" style={{ fontWeight: 700, flex: 1, minWidth: 140, background: 'transparent' }} />
        <Select size="small" value={table.vatMode} style={{ width: 130 }}
          onChange={(v) => onChange((tb) => ({ ...tb, vatMode: v }))}
          options={[{ value: 'inkl25', label: `${t('With VAT')} 25%` }, { value: 'none', label: t('Without VAT') }]} />
        <Select size="small" value={table.color} style={{ width: 70 }}
          onChange={(v) => onChange((tb) => ({ ...tb, color: v }))}
          options={COLOR_KEYS.map((c) => ({ value: c, label: '●', style: { color: KALKYL_COLORS[c].head } }))} />
        <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={isFirst} onClick={() => onMove(-1)} />
        <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={isLast} onClick={() => onMove(1)} />
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onRemove} />
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', padding: '6px 8px 10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th key={c.id} style={{ padding: '4px 4px', textAlign: c.type === 'amount' ? 'right' : 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Input value={c.label} onChange={(e) => setCol(c.id, { label: e.target.value })}
                      variant="borderless" size="small" style={{ fontWeight: 600, padding: '0 2px' }} />
                    {c.type !== 'amount' && table.columns.length > 1 ? (
                      <Button size="small" type="text" icon={<DeleteOutlined />} onClick={() => removeCol(c.id)}
                        style={{ opacity: 0.4 }} />
                    ) : null}
                  </div>
                </th>
              ))}
              <th style={{ width: 60, textAlign: 'right' }}>
                <Button size="small" type="text" icon={<PlusOutlined />} onClick={addCol} title={t('Add column')} />
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, idx) => (
              <tr key={r.id}>
                {table.columns.map((c) => (
                  <td key={c.id} style={{ padding: '2px 4px' }}>
                    {c.type === 'amount' ? (
                      <InputNumber value={r.cells?.[c.id]} onChange={(v) => setCell(r.id, c.id, v)}
                        controls={false} style={{ width: '100%', textAlign: 'right' }}
                        formatter={amountFmt} parser={amountParse} />
                    ) : (
                      <Input value={r.cells?.[c.id] || ''} onChange={(e) => setCell(r.id, c.id, e.target.value)}
                        placeholder={c.type === 'date' ? 'ÅÅÅÅ-MM-DD' : ''} size="small" />
                    )}
                  </td>
                ))}
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => moveRow(idx, -1)} />
                  <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={idx === table.rows.length - 1} onClick={() => moveRow(idx, 1)} />
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeRow(r.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <Button size="small" icon={<PlusOutlined />} onClick={addRow}>{t('Add row')}</Button>
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {formatSek(tt.brutto)}
            {tt.vat > 0 ? <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--muted,#64748b)', marginLeft: 6 }}>
              ({formatSek(tt.netto)} + {t('VAT')} {formatSek(tt.vat)})</span> : null}
          </span>
        </div>
      </div>
    </div>
  );
}
