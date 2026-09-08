'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, InputNumber, Modal, Select, message } from 'antd';
import {
  ArrowLeftOutlined, ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined,
  DownloadOutlined, FilePdfOutlined, PlusOutlined, SaveOutlined, ShareAltOutlined, UploadOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, useParams } from '@/src/shared/routing/routerCompat';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { useAuthStore } from '@/src/store/authStore';
import { formatSek } from '@/src/utils/formatCurrency';
import { useProjektkalkylStore } from '@/src/store/projektkalkylStore';
import CommentsPanel from '@/src/features/projektkalkyl/CommentsPanel';
import {
  KALKYL_COLORS, COLOR_KEYS, VAT_RATES, newColumn, newRow, newTable,
  tableTotals, sideTotals, moveInArray, lineAmount, tableVatRate,
} from '@/src/features/projektkalkyl/kalkylModel';
import { parseExcelExpenses } from '@/src/features/projektkalkyl/excelImport';
import { exportKalkylToExcel } from '@/src/features/projektkalkyl/excelExport';

const amountFmt = (v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const amountParse = (v) => (v || '').replace(/\s/g, '');
const COLLAPSE_AT = 12; // tables longer than this collapse to the last 10 rows

export default function ProjektkalkylDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { fetchOne, update, createShareLink, revokeShareLink, addComment, downloadPdf } = useProjektkalkylStore();
  const authorName = useAuthStore((s) => s.user?.name || s.user?.email);

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [tables, setTables] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [addModal, setAddModal] = useState(null); // { side, title, vatMode, color }
  const [shareModal, setShareModal] = useState(null); // { url, expiresAt }
  const hydratedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const k = await fetchOne(id);
        if (!alive) return;
        setName(k.name || '');
        setNote(k.note || '');
        // Render exactly what's saved. Presets are seeded once at creation (list
        // page), so an emptied+saved board stays empty instead of re-seeding.
        setTables(Array.isArray(k.tables) ? k.tables : []);
        setComments(Array.isArray(k.comments) ? k.comments : []);
      } catch {
        message.error(t('Could not load the calculation'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Autosave (debounced) so a live shared viewer sees edits without a manual save.
  useEffect(() => {
    if (loading) return undefined;
    if (!hydratedRef.current) { hydratedRef.current = true; return undefined; }
    const tmo = setTimeout(() => { update(id, { name, note, tables }).catch(() => {}); }, 1500);
    return () => clearTimeout(tmo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, note, tables]);

  const openShare = async () => {
    try {
      await update(id, { name, note, tables });
      const { token, expiresAt } = await createShareLink(id);
      setShareModal({ url: `${window.location.origin}/kalkyl/${token}`, expiresAt });
    } catch { message.error(t('Could not create the link')); }
  };
  const revokeShare = async () => {
    try { await revokeShareLink(id); setShareModal(null); message.success(t('Link revoked')); }
    catch { /* ignore */ }
  };

  const incomeTotals = useMemo(() => sideTotals(tables, 'income'), [tables]);
  const expenseTotals = useMemo(() => sideTotals(tables, 'expense'), [tables]);
  const profit = incomeTotals.brutto - expenseTotals.brutto;

  const patchTable = (tid, updater) => setTables((ts) => ts.map((tb) => (tb.id === tid ? updater(tb) : tb)));
  const removeTable = (tid) => setTables((ts) => ts.filter((tb) => tb.id !== tid));
  const moveTable = (tid, dir) => setTables((ts) => {
    const side = ts.find((x) => x.id === tid)?.side;
    const sideItems = ts.filter((x) => x.side === side);
    const idx = sideItems.findIndex((x) => x.id === tid);
    const reordered = moveInArray(sideItems, idx, dir);
    const others = ts.filter((x) => x.side !== side);
    return side === 'income' ? [...reordered, ...others] : [...others, ...reordered];
  });

  const confirmAddTable = () => {
    const { side, title, vatRate, color, type } = addModal;
    setTables((ts) => [...ts, newTable(side, t, { title: title || undefined, vatRate, color, type })]);
    setAddModal(null);
  };

  // Programmatic file picker → parse → append rows mapped to the table's columns.
  const importExcel = (tid) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const parsed = await parseExcelExpenses(file);
        if (!parsed.length) { message.warning(t('No rows found in the file')); return; }
        patchTable(tid, (tb) => {
          const descCol = tb.columns.find((c) => c.type === 'text');
          const dateCol = tb.columns.find((c) => c.type === 'date');
          const amtCol = tb.columns.find((c) => c.type === 'amount');
          const rows = parsed.map((p) => {
            const cells = {};
            if (descCol) cells[descCol.id] = p.description;
            if (dateCol) cells[dateCol.id] = p.date;
            if (amtCol && p.amount != null) cells[amtCol.id] = p.amount;
            return { ...newRow(), cells };
          });
          return { ...tb, rows: [...tb.rows, ...rows] };
        });
        message.success(t('Imported {n} rows').replace('{n}', parsed.length));
      } catch {
        message.error(t('Could not read the Excel file'));
      }
    };
    input.click();
  };

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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button icon={<ShareAltOutlined />} onClick={openShare}>{t('Share')}</Button>
          <Button icon={<DownloadOutlined />} onClick={() => exportKalkylToExcel({ name, note, tables }, t)}>Excel</Button>
          <Button icon={<FilePdfOutlined />} loading={pdfBusy} onClick={async () => {
            setPdfBusy(true);
            try { await update(id, { name, note, tables }); await downloadPdf(id, name || 'projektkalkyl'); }
            catch { message.error(t('Could not create the PDF')); } finally { setPdfBusy(false); }
          }}>PDF</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>{t('Save')}</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <Side t={t} title={t('Income')} tables={incomeTables} totals={incomeTotals} totalColor="#16a35f"
          patchTable={patchTable} moveTable={moveTable} removeTable={removeTable}
          onAdd={() => setAddModal({ side: 'income', title: '', vatRate: 25, color: 'green', type: 'simple' })} />
        <Side t={t} title={t('Expenses')} tables={expenseTables} totals={expenseTotals} totalColor="#e5484d"
          patchTable={patchTable} moveTable={moveTable} removeTable={removeTable} onImport={importExcel}
          onAdd={() => setAddModal({ side: 'expense', title: '', vatRate: 25, color: 'blue', type: 'simple' })} />
      </div>

      {/* Note (left) + Profit (right) — same row, same height, aligned to the columns */}
      <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ flex: '1 1 460px', minWidth: 320 }}>
          <Input.TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Note')}
            autoSize={false} style={{ height: '100%', minHeight: 56, resize: 'none' }} />
        </div>
        <div style={{ flex: '1 1 460px', minWidth: 320, background: profit < 0 ? '#fdecec' : '#e7f6ec',
          border: `1px solid ${profit < 0 ? '#f3b4b4' : '#a8e0bf'}`, borderRadius: 12, padding: '14px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>{t('Profit')}</span>
          <span style={{ fontWeight: 800, fontSize: 20, color: profit < 0 ? '#e5484d' : '#16a35f', fontVariantNumeric: 'tabular-nums' }}>
            {formatSek(profit)}
          </span>
        </div>
      </div>

      <ProgressPanel t={t} income={incomeTotals.brutto} expense={expenseTotals.brutto} profit={profit} />

      <CommentsPanel comments={comments} onSubmit={async (p) => {
        const updated = await addComment(id, { text: p.text, authorName });
        setComments(updated);
      }} />

      <Modal open={Boolean(shareModal)} onCancel={() => setShareModal(null)} footer={null} title={t('Share link')} destroyOnHidden>
        {shareModal ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <p style={{ margin: 0, color: 'var(--muted,#64748b)', fontSize: 13 }}>
              {t('Anyone with the link can view (read-only). It self-destructs after 1 hour and updates live.')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input readOnly value={shareModal.url} onFocus={(e) => e.target.select()} />
              <Button type="primary" onClick={() => { navigator.clipboard?.writeText(shareModal.url); message.success(t('Copied')); }}>{t('Copy')}</Button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--muted,#64748b)' }}>
                {t('Valid until')}: {new Date(shareModal.expiresAt).toLocaleTimeString()}
              </span>
              <Button danger type="text" onClick={revokeShare}>{t('Revoke link')}</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(addModal)} onCancel={() => setAddModal(null)} onOk={confirmAddTable}
        okText={t('Add table')} cancelText={t('Cancel')} title={t('New table')} destroyOnHidden>
        {addModal ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted,#64748b)' }}>{t('Name')}</label>
              <Input autoFocus value={addModal.title} placeholder={t('New table')}
                onChange={(e) => setAddModal((m) => ({ ...m, title: e.target.value }))}
                onPressEnter={confirmAddTable} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--muted,#64748b)' }}>{t('Table type')}</label>
              <Select value={addModal.type} style={{ width: '100%' }}
                onChange={(v) => setAddModal((m) => ({ ...m, type: v }))}
                options={[
                  { value: 'simple', label: t('Simple (type the amount)') },
                  { value: 'qty', label: t('With multiplication (qty × price)') },
                ]} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: 'var(--muted,#64748b)' }}>{t('VAT')}</label>
                <Select value={addModal.vatRate} style={{ width: '100%' }}
                  onChange={(v) => setAddModal((m) => ({ ...m, vatRate: v }))}
                  options={VAT_RATES.map((r) => ({ value: r, label: r === 0 ? t('Without VAT') : `${t('VAT')} ${r}%` }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--muted,#64748b)' }}>{t('Color')}</label>
                <Select value={addModal.color} style={{ width: 90 }}
                  onChange={(v) => setAddModal((m) => ({ ...m, color: v }))}
                  options={COLOR_KEYS.map((c) => ({ value: c, label: '●', style: { color: KALKYL_COLORS[c].head } }))} />
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function ProgressPanel({ t, income, expense, profit }) {
  const [open, setOpen] = useState(true);
  const costShare = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : (expense > 0 ? 100 : 0);
  const margin = income > 0 ? Math.round((profit / income) * 100) : null;
  const bar = (pct, color) => (
    <div style={{ flex: 1, height: 14, borderRadius: 999, background: '#eef1f5', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .2s' }} />
    </div>
  );
  const rowStyle = { display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' };
  const labelStyle = { width: 96, fontSize: 13, color: 'var(--muted,#64748b)' };
  const valStyle = { width: 130, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 };
  return (
    <div style={{ marginTop: 20, border: '1px solid var(--border,#e2e8f0)', borderRadius: 12, padding: '16px 18px' }}>
      <h3 onClick={() => setOpen((o) => !o)}
        style={{ margin: open ? '0 0 10px' : 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontSize: 12, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', display: 'inline-block' }}>▸</span>
        {t('Progress')}
      </h3>
      {open ? (
      <>
      <div style={rowStyle}>
        <span style={labelStyle}>{t('Income')}</span>
        {bar(income > 0 ? 100 : 0, '#16a35f')}
        <span style={valStyle}>{formatSek(income)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>{t('Expenses')}</span>
        {bar(costShare, '#e5484d')}
        <span style={valStyle}>{formatSek(expense)} <span style={{ color: 'var(--muted,#64748b)', fontWeight: 400 }}>({costShare}%)</span></span>
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap', fontSize: 14 }}>
        <span>{t('Margin %')}: <b style={{ color: profit < 0 ? '#e5484d' : '#16a35f' }}>{margin == null ? '—' : `${margin}%`}</b></span>
        <span>{t('Cost share')}: <b>{costShare}%</b></span>
        <span>{t('Profit')}: <b style={{ color: profit < 0 ? '#e5484d' : '#16a35f' }}>{formatSek(profit)}</b></span>
      </div>
      </>
      ) : null}
    </div>
  );
}

function Side({ t, title, tables, totals, totalColor, patchTable, moveTable, removeTable, onAdd, onImport }) {
  return (
    <div style={{ flex: '1 1 460px', minWidth: 320, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 12px' }}>{title}</h3>
      {tables.map((tb, i) => (
        <KalkylTable key={tb.id} t={t} table={tb} isFirst={i === 0} isLast={i === tables.length - 1}
          onChange={(u) => patchTable(tb.id, u)} onMove={(d) => moveTable(tb.id, d)} onRemove={() => removeTable(tb.id)}
          onImport={onImport ? () => onImport(tb.id) : null} />
      ))}
      <Button icon={<PlusOutlined />} onClick={onAdd} style={{ marginBottom: 16, alignSelf: 'flex-start' }}>{t('Add table')}</Button>
      <div style={{ marginTop: 'auto', background: totalColor, color: '#fff', borderRadius: 10, padding: '12px 16px',
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

function KalkylTable({ t, table, isFirst, isLast, onChange, onMove, onRemove, onImport }) {
  const [expanded, setExpanded] = useState(false);
  const palette = KALKYL_COLORS[table.color] || KALKYL_COLORS.grey;
  const tt = tableTotals(table);

  const setCol = (cid, patch) => onChange((tb) => ({ ...tb, columns: tb.columns.map((c) => (c.id === cid ? { ...c, ...patch } : c)) }));
  const addCol = () => onChange((tb) => ({ ...tb, columns: [...tb.columns, newColumn(t('Column'), 'text')] }));
  const removeCol = (cid) => onChange((tb) => ({ ...tb, columns: tb.columns.filter((c) => c.id !== cid) }));
  const setCell = (rid, cid, val) => onChange((tb) => ({ ...tb, rows: tb.rows.map((r) => (r.id === rid ? { ...r, cells: { ...r.cells, [cid]: val } } : r)) }));
  const addRow = () => onChange((tb) => ({ ...tb, rows: [...tb.rows, newRow()] }));
  const removeRow = (rid) => onChange((tb) => ({ ...tb, rows: tb.rows.filter((r) => r.id !== rid) }));
  const moveRow = (idx, dir) => onChange((tb) => ({ ...tb, rows: moveInArray(tb.rows, idx, dir) }));
  const setRowVat = (rid, val) => onChange((tb) => ({ ...tb, rows: tb.rows.map((r) => (r.id === rid ? { ...r, vatRate: val === '' ? undefined : Number(val) } : r)) }));

  const columns = table.columns || [];
  const rows = table.rows || [];
  const computedAmount = columns.some((c) => c.type === 'qty') && columns.some((c) => c.type === 'price');
  const collapsed = rows.length > COLLAPSE_AT && !expanded;
  const shown = collapsed ? rows.slice(-10) : rows;
  const offset = rows.length - shown.length;

  return (
    <div style={{ background: palette.bg, borderRadius: 10, marginBottom: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ background: palette.head, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Input value={table.title} onChange={(e) => onChange((tb) => ({ ...tb, title: e.target.value }))}
          variant="borderless" style={{ fontWeight: 700, flex: 1, minWidth: 130, background: 'transparent' }} />
        {onImport ? <Button size="small" type="text" icon={<UploadOutlined />} onClick={onImport} title={t('Import Excel')} /> : null}
        <Select size="small" value={tableVatRate(table)} style={{ width: 120 }} title={t('VAT')}
          onChange={(v) => onChange((tb) => ({ ...tb, vatRate: v, vatMode: undefined }))}
          options={VAT_RATES.map((r) => ({ value: r, label: r === 0 ? t('Without VAT') : `${t('VAT')} ${r}%` }))} />
        <Select size="small" value={table.color} style={{ width: 66 }}
          onChange={(v) => onChange((tb) => ({ ...tb, color: v }))}
          options={COLOR_KEYS.map((c) => ({ value: c, label: '●', style: { color: KALKYL_COLORS[c].head } }))} />
        <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={isFirst} onClick={() => onMove(-1)} />
        <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={isLast} onClick={() => onMove(1)} />
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onRemove} />
      </div>

      <div style={{ overflowX: 'auto', padding: '6px 8px 10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.id} style={{ padding: '4px 4px', textAlign: c.type === 'amount' ? 'right' : 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Input value={c.label} onChange={(e) => setCol(c.id, { label: e.target.value })}
                      variant="borderless" size="small" style={{ fontWeight: 600, padding: '0 2px' }} />
                    {c.type !== 'amount' && columns.length > 1 ? (
                      <Button size="small" type="text" icon={<DeleteOutlined />} onClick={() => removeCol(c.id)} style={{ opacity: 0.4 }} />
                    ) : null}
                  </div>
                </th>
              ))}
              <th style={{ width: 176, textAlign: 'right' }}>
                <Button size="small" type="text" icon={<PlusOutlined />} onClick={addCol} title={t('Add column')} />
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
                  {columns.map((c) => (
                    <td key={c.id} style={{ padding: '2px 4px' }}>
                      {c.type === 'amount' && computedAmount ? (
                        <div style={{ textAlign: 'right', padding: '2px 8px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {formatSek(lineAmount(table, r))}
                        </div>
                      ) : (c.type === 'amount' || c.type === 'qty' || c.type === 'price') ? (
                        <InputNumber size="small" value={r.cells?.[c.id]} onChange={(v) => setCell(r.id, c.id, v)}
                          controls={false} style={{ width: '100%', textAlign: 'right' }} formatter={amountFmt} parser={amountParse} />
                      ) : (
                        <Input value={r.cells?.[c.id] || ''} onChange={(e) => setCell(r.id, c.id, e.target.value)}
                          placeholder={c.type === 'date' ? 'ÅÅÅÅ-MM-DD' : ''} size="small" />
                      )}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Select size="small" variant="borderless" style={{ width: 62 }} title={t('VAT')}
                      value={Number.isFinite(r.vatRate) ? r.vatRate : ''}
                      onChange={(v) => setRowVat(r.id, v)}
                      options={[{ value: '', label: '—' }, ...VAT_RATES.map((rt) => ({ value: rt, label: rt === 0 ? '0%' : `${rt}%` }))]} />
                    <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={idx === 0 || (collapsed && i === 0)} onClick={() => moveRow(idx, -1)} />
                    <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={idx === rows.length - 1} onClick={() => moveRow(idx, 1)} />
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeRow(r.id)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, alignItems: 'center', marginTop: 6, fontSize: 12, color: 'var(--muted,#64748b)' }}>
          <span>{t('Markup %')} <InputNumber size="small" min={0} controls={false} value={table.markupPct || 0}
            onChange={(v) => onChange((tb) => ({ ...tb, markupPct: Number(v) || 0 }))} style={{ width: 54 }} /></span>
          <span>{t('Reserve %')} <InputNumber size="small" min={0} controls={false} value={table.contingencyPct || 0}
            onChange={(v) => onChange((tb) => ({ ...tb, contingencyPct: Number(v) || 0 }))} style={{ width: 54 }} /></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span>
            <Button size="small" icon={<PlusOutlined />} onClick={addRow}>{t('Add row')}</Button>
            {rows.length > COLLAPSE_AT && expanded ? (
              <Button size="small" type="link" onClick={() => setExpanded(false)}>{t('Collapse')}</Button>
            ) : null}
          </span>
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {formatSek(tt.brutto)}
            {(tt.markup > 0 || tt.contingency > 0 || tt.vat > 0) ? (
              <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--muted,#64748b)', marginLeft: 6 }}>
                ({formatSek(tt.base)}{tt.markup > 0 ? ` + ${t('Markup %')} ${formatSek(tt.markup)}` : ''}{tt.contingency > 0 ? ` + ${t('Reserve %')} ${formatSek(tt.contingency)}` : ''}{tt.vat > 0 ? ` + ${t('VAT')} ${formatSek(tt.vat)}` : ''})
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
}
