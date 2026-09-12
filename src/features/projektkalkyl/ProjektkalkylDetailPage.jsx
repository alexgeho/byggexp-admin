'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Input, InputNumber, Modal, Popover, Select, message } from 'antd';
import {
  ArrowLeftOutlined, ArrowUpOutlined, ArrowDownOutlined, CloseOutlined, DeleteOutlined,
  DownloadOutlined, FileExcelOutlined, FilePdfOutlined, MoreOutlined, PlusOutlined, SaveOutlined, ScanOutlined, SettingOutlined, ShareAltOutlined, SnippetsOutlined, UploadOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, useParams } from '@/src/shared/routing/routerCompat';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { getEntityId, matchesEntityId } from '@/src/utils/entityId';
import { formatAmount, formatMoney } from '@/src/utils/formatCurrency';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { useProjektkalkylStore } from '@/src/store/projektkalkylStore';
import CommentsPanel from '@/src/features/projektkalkyl/CommentsPanel';
import {
  KALKYL_COLORS, COLOR_KEYS, VAT_RATES, newColumn, newRow, newTable,
  tableTotals, sideTotals, moveInArray, lineAmount, lineNet, lineVat, tableVatRate, amountIsGross,
} from '@/src/features/projektkalkyl/kalkylModel';
import { parseExcelExpenses, downloadImportTemplate } from '@/src/features/projektkalkyl/excelImport';
import { exportKalkylToExcel } from '@/src/features/projektkalkyl/excelExport';
import '@/src/features/projektkalkyl/projektkalkyl.scss';

const amountFmt = (v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const amountParse = (v) => (v || '').replace(/\s/g, '');
const COLLAPSE_AT = 12; // tables longer than this collapse to the last 10 rows
// Muted, same-gamma accents (softer than the old loud green/red).
const GREEN = '#4e9d78';
const RED = '#cf7676';
// Per-type column widths (px) for the fixed-layout table; the text/description
// column is left without a width so it flexes and fills the space on the right.
const COL_W = { date: 132, amount: 76, vat: 62, amount_excl: 96, number: 96, qty: 88, price: 96 };
// Canonical left→right order so a toggled-on column lands in a sensible spot.
const COL_ORDER = { text: 0, date: 1, qty: 2, price: 3, amount: 4, number: 5, vat: 6, amount_excl: 7 };
function insertColumn(cols, col) {
  const target = COL_ORDER[col.type] ?? 99;
  let idx = cols.length;
  for (let i = 0; i < cols.length; i += 1) {
    if ((COL_ORDER[cols[i].type] ?? 99) > target) { idx = i; break; }
  }
  const next = [...cols];
  next.splice(idx, 0, col);
  return next;
}

export default function ProjektkalkylDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { fetchOne, update, createShareLink, revokeShareLink, addComment, downloadPdf, saveAsTemplate } = useProjektkalkylStore();
  const authorName = useAuthStore((s) => s.user?.name || s.user?.email);

  const companyCurrency = useCompanyCurrency();
  const userRole = useAuthStore((s) => s.user?.role);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [currency, setCurrency] = useState(companyCurrency);
  const [projectId, setProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projActuals, setProjActuals] = useState({ income: [], expense: [] });
  const [hiddenPreview, setHiddenPreview] = useState({}); // { income?:true, expense?:true }
  const [scanEnabled, setScanEnabled] = useState(false);
  const [tables, setTables] = useState([]);
  const money = (v) => formatMoney(v, currency);
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
        setCurrency(k.currency || companyCurrency);
        setProjectId(k.projectId || null);
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

  // Projects (for the link selector) + whether receipt scanning is available.
  useEffect(() => {
    apiClient.get(userRole === 'superadmin' ? '/projects' : '/projects/my')
      .then(({ data }) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));
    apiClient.get('/scan/status')
      .then(({ data }) => setScanEnabled(Boolean(data?.enabled)))
      .catch(() => setScanEnabled(false));
  }, [userRole]);

  // When linked to a project, pull its REAL income (customer invoices) and costs
  // (supplier invoices + approved/reimbursed expenses) to show as a read-only
  // "from the project" block that counts toward the totals.
  useEffect(() => {
    if (!projectId) { setProjActuals({ income: [], expense: [] }); return undefined; }
    setHiddenPreview({}); // re-selecting a project shows its preview again
    let alive = true;
    const belongs = (r) => matchesEntityId({ _id: (typeof r.projectId === 'object' ? r.projectId?._id : r.projectId) }, projectId);
    Promise.all([
      apiClient.get('/invoices').then((r) => r.data).catch(() => []),
      apiClient.get('/supplier-invoices').then((r) => r.data).catch(() => []),
      apiClient.get('/expenses').then((r) => r.data).catch(() => []),
    ]).then(([inv, sup, exp]) => {
      if (!alive) return;
      const income = (inv || []).filter((i) => ['sent', 'overdue', 'paid'].includes(i.status) && belongs(i)).map((i) => ({
        desc: `${i.companyName || '—'}${i.invoiceNumber ? ` #${i.invoiceNumber}` : ''}`,
        date: i.date || '',
        gross: Number(i.roundedTotal ?? i.total) || 0,
        net: Number(i.subtotal ?? ((Number(i.total) || 0) - (Number(i.vat) || 0))) || 0,
      }));
      const expSup = (sup || []).filter(belongs).map((s) => ({
        desc: s.supplierName || '—', date: s.invoiceDate || '', gross: Number(s.total) || 0, net: Number(s.amountExclVat) || 0,
      }));
      const expExp = (exp || []).filter((e) => ['approved', 'reimbursed'].includes(e.status) && belongs(e)).map((e) => ({
        desc: e.supplierName || '—', date: e.date || '', gross: Number(e.amount) || 0, net: (Number(e.amount) || 0) - (Number(e.vat) || 0),
      }));
      setProjActuals({ income, expense: [...expSup, ...expExp] });
    });
    return () => { alive = false; };
  }, [projectId]);

  // Autosave (debounced) so a live shared viewer sees edits without a manual save.
  useEffect(() => {
    if (loading) return undefined;
    if (!hydratedRef.current) { hydratedRef.current = true; return undefined; }
    const tmo = setTimeout(() => { update(id, { name, note, currency, projectId, tables }).catch(() => {}); }, 1500);
    return () => clearTimeout(tmo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, note, currency, projectId, tables]);

  const openShare = async () => {
    try {
      await update(id, { name, note, currency, projectId, tables });
      const { token, expiresAt } = await createShareLink(id);
      setShareModal({ url: `${window.location.origin}/kalkyl/${token}`, expiresAt });
    } catch { message.error(t('Could not create the link')); }
  };
  const revokeShare = async () => {
    try { await revokeShareLink(id); setShareModal(null); message.success(t('Link revoked')); }
    catch { /* ignore */ }
  };

  // Totals come from the editable tables only. The "from the project" preview is
  // read-only and NOT counted — you copy the rows you want into a real table
  // (which then counts), so nothing is double-counted.
  const incomeTotals = useMemo(() => sideTotals(tables, 'income'), [tables]);
  const expenseTotals = useMemo(() => sideTotals(tables, 'expense'), [tables]);
  // Profit is VAT-neutral: VAT is pass-through money, not revenue or cost, so the
  // result is computed on the net (ex-VAT) figures, not the gross totals.
  const profit = incomeTotals.netto - expenseTotals.netto;

  const linkedProjectName = useMemo(
    () => projects.find((p) => matchesEntityId(p, projectId))?.name || t('the project'),
    [projects, projectId, t],
  );

  // Copy the read-only project rows into a new editable table (gross-mode, with a
  // computed "excl. VAT" column) so they can be edited and saved in the calc.
  const copyProjectToTable = (side) => {
    const rows = projActuals[side] || [];
    if (!rows.length) return;
    const descC = newColumn(t('Description'), 'text');
    const dateC = newColumn(t('Date'), 'date');
    const amtC = newColumn(t('Amount'), 'amount');
    const exclC = newColumn(t('excl. VAT'), 'amount_excl');
    const tableRows = rows.map((r) => {
      const gross = Number(r.gross) || 0;
      const net = Number(r.net) || 0;
      const pct = net > 0 ? ((gross - net) / net) * 100 : 0;
      const rate = VAT_RATES.reduce((best, x) => (Math.abs(x - pct) < Math.abs(best - pct) ? x : best), 0);
      return { ...newRow(), vatRate: rate, cells: { [descC.id]: r.desc, [dateC.id]: r.date, [amtC.id]: gross } };
    });
    const tb = newTable(side, t, {
      title: `${linkedProjectName} (${t('copy')})`,
      color: side === 'income' ? 'green' : 'blue',
      columns: [descC, dateC, amtC, exclC],
    });
    tb.amountInclVat = true;
    tb.rows = tableRows;
    setTables((ts) => [...ts, tb]);
    message.success(t('Copied to table'));
  };

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

  // Build a table row from one scanned document, mapped onto the table's columns
  // (gross tables get the total, net tables the ex-VAT amount; VAT rate inferred).
  const rowFromScan = (tb, data) => {
    const descCol = tb.columns.find((c) => c.type === 'text');
    const dateCol = tb.columns.find((c) => c.type === 'date');
    const amtCol = tb.columns.find((c) => c.type === 'amount');
    const total = Number(data.total) || 0;
    const net = Number(data.amountExclVat) || 0;
    const vat = Number(data.vat) || 0;
    const rate = net > 0 ? VAT_RATES.reduce((best, r) => (Math.abs(r - (vat / net) * 100) < Math.abs(best - (vat / net) * 100) ? r : best), 0) : undefined;
    const cells = {};
    if (descCol) cells[descCol.id] = data.supplierName || '';
    if (dateCol) cells[dateCol.id] = data.date || '';
    if (amtCol) cells[amtCol.id] = amountIsGross(tb) ? total : net;
    const row = { ...newRow(), cells };
    if (rate != null) row.vatRate = rate;
    return row;
  };

  // Scan ONE OR MANY photographed/PDF receipts/invoices straight into the table —
  // each file becomes a row. Used by both the Scan button (multi-select) and
  // dropping files onto the table.
  const scanFilesIntoTable = async (tid, fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    const hide = message.loading(`${t('Scanning…')}${files.length > 1 ? ` (${files.length})` : ''}`, 0);
    try {
      const results = await Promise.all(files.map(async (file) => {
        try {
          const fd = new FormData();
          fd.append('file', file);
          const { data } = await apiClient.post('/scan', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          return data;
        } catch { return null; }
      }));
      const ok = results.filter(Boolean);
      if (ok.length) {
        patchTable(tid, (tb) => ({ ...tb, rows: [...tb.rows, ...ok.map((data) => rowFromScan(tb, data))] }));
      }
      if (ok.length === files.length) message.success(`${ok.length} ${t('added')}`);
      else if (ok.length) message.warning(`${ok.length}/${files.length} ${t('added')}`);
      else message.error(t('Could not read the document — please enter the details manually'));
    } finally {
      hide();
    }
  };

  const scanIntoTable = (tid) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.multiple = true;
    input.onchange = (e) => scanFilesIntoTable(tid, e.target.files);
    input.click();
  };

  const save = async () => {
    setSaving(true);
    try {
      await update(id, { name, note, currency, projectId, tables });
      message.success(t('Saved'));
    } catch { /* store shows error */ } finally { setSaving(false); }
  };

  const goBack = () => navigate(pathname.replace(/\/[^/]+$/, ''));

  if (loading) return <div style={{ padding: 24 }}>{t('Loading…')}</div>;

  const incomeTables = tables.filter((x) => x.side === 'income');
  const expenseTables = tables.filter((x) => x.side === 'expense');

  // Next palette colour, cycling after the last table on that side so each new
  // table gets a fresh colour in turn.
  const nextColor = (arr) => {
    const i = COLOR_KEYS.indexOf(arr[arr.length - 1]?.color);
    return COLOR_KEYS[(i + 1) % COLOR_KEYS.length];
  };

  return (
    <div className="projektkalkyl" style={{ paddingBottom: 90 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Button size="large" icon={<ArrowLeftOutlined />} onClick={goBack}>{t('Back')}</Button>
        <Input size="large" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Name')}
          style={{ maxWidth: 340, fontWeight: 600 }} />
        <Select size="large" value={currency} onChange={setCurrency} title={t('Currency')} style={{ width: 110 }}
          options={['SEK', 'NOK', 'DKK', 'EUR', 'USD', 'GBP', 'PLN'].map((c) => ({ value: c, label: c }))} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--muted,#64748b)', whiteSpace: 'nowrap' }}>{t('Pull from project')}</span>
          <Select
            size="large"
            allowClear
            showSearch
            optionFilterProp="label"
            value={projectId || undefined}
            onChange={(v) => setProjectId(v || null)}
            title={t("Pick a project to show its real income & expenses below, then copy them into your tables")}
            placeholder={t('Select a project…')}
            style={{ minWidth: 240 }}
            options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))}
          />
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button size="large" icon={<SnippetsOutlined />} title={t('Save as template')} onClick={async () => {
            try { await update(id, { name, note, currency, projectId, tables }); await saveAsTemplate(id); message.success(t('Saved as template')); }
            catch { message.error(t('Could not save the template')); }
          }} />
          <Button size="large" icon={<ShareAltOutlined />} onClick={openShare}>{t('Share')}</Button>
          <Dropdown trigger={['click']} menu={{ items: [
            { key: 'excel', icon: <FileExcelOutlined />, label: 'Excel', onClick: () => exportKalkylToExcel({ name, note, tables }, t) },
            { key: 'pdf', icon: <FilePdfOutlined />, label: 'PDF', onClick: async () => {
              setPdfBusy(true);
              try { await update(id, { name, note, currency, projectId, tables }); await downloadPdf(id, name || 'projektkalkyl'); }
              catch { message.error(t('Could not create the PDF')); } finally { setPdfBusy(false); }
            } },
          ] }}>
            <Button size="large" icon={<DownloadOutlined />} loading={pdfBusy}>{t('Export')}</Button>
          </Dropdown>
          <Button size="large" type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>{t('Save')}</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <Side money={money} t={t} title={t('Income')} tables={incomeTables} totals={incomeTotals} totalColor={GREEN}
          projectRows={hiddenPreview.income ? [] : projActuals.income}
          onCopyProject={() => copyProjectToTable('income')}
          onClosePreview={() => setHiddenPreview((h) => ({ ...h, income: true }))}
          onScan={scanIntoTable} onScanFiles={scanFilesIntoTable} scanEnabled={scanEnabled}
          patchTable={patchTable} moveTable={moveTable} removeTable={removeTable}
          onAdd={() => setAddModal({ side: 'income', title: '', vatRate: 25, color: nextColor(incomeTables), type: 'simple' })} />
        <Side money={money} t={t} title={t('Expenses')} tables={expenseTables} totals={expenseTotals} totalColor={RED}
          projectRows={hiddenPreview.expense ? [] : projActuals.expense}
          onCopyProject={() => copyProjectToTable('expense')}
          onClosePreview={() => setHiddenPreview((h) => ({ ...h, expense: true }))}
          onScan={scanIntoTable} onScanFiles={scanFilesIntoTable} scanEnabled={scanEnabled}
          patchTable={patchTable} moveTable={moveTable} removeTable={removeTable} onImport={importExcel}
          onAdd={() => setAddModal({ side: 'expense', title: '', vatRate: 25, color: nextColor(expenseTables), type: 'simple' })} />
      </div>

      {/* Note (left) + Profit (right) — same row, same height, aligned to the columns */}
      <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ flex: '1 1 460px', minWidth: 320 }}>
          <Input.TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Note')}
            autoSize={false} style={{ height: '100%', minHeight: 56, resize: 'none', borderRadius: 12 }} />
        </div>
        <div style={{ flex: '1 1 460px', minWidth: 320, background: profit < 0 ? '#fdecec' : '#e7f6ec',
          border: `1px solid ${profit < 0 ? '#f3b4b4' : '#a8e0bf'}`, borderRadius: 12, padding: '14px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>
            {t('Profit')} <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--muted,#64748b)' }}>({t('Excl. VAT')})</span>
          </span>
          <span style={{ fontWeight: 800, fontSize: 20, color: profit < 0 ? RED : GREEN, fontVariantNumeric: 'tabular-nums' }}>
            {money(profit)}
          </span>
        </div>
      </div>

      <SummaryPanel money={money} t={t} income={incomeTotals.netto} expense={expenseTotals.netto} profit={profit} />

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
        okText={t('Add table')} cancelText={t('Cancel')} title={t('New table')} destroyOnHidden
        styles={{ footer: { marginTop: 24 } }}>
        {addModal ? (
          (() => {
            const labelStyle = { display: 'block', fontSize: 13, color: 'var(--muted,#64748b)', marginBottom: 4 };
            const fieldStyle = { flex: 1, minWidth: 0 };
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                <div>
                  <span style={labelStyle}>{t('Name')}</span>
                  <Input autoFocus value={addModal.title} placeholder={t('New table')}
                    onChange={(e) => setAddModal((m) => ({ ...m, title: e.target.value }))}
                    onPressEnter={confirmAddTable} />
                </div>
                <div>
                  <span style={labelStyle}>{t('Table type')}</span>
                  <Select value={addModal.type} style={{ width: '100%' }}
                    onChange={(v) => setAddModal((m) => ({ ...m, type: v, vatRate: v === 'vat' && !m.vatRate ? 25 : m.vatRate }))}
                    options={[
                      { value: 'simple', label: t('Simple (type the amount)') },
                      { value: 'vat', label: t('Goods with VAT (Amount → VAT → excl. VAT)') },
                      { value: 'qty', label: t('With multiplication (qty × price)') },
                    ]} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={fieldStyle}>
                    <span style={labelStyle}>{t('VAT')}</span>
                    <Select value={addModal.vatRate} style={{ width: '100%' }}
                      onChange={(v) => setAddModal((m) => ({ ...m, vatRate: v }))}
                      options={VAT_RATES.map((r) => ({ value: r, label: r === 0 ? t('Without VAT') : `${t('VAT')} ${r}%` }))} />
                  </div>
                  <div style={fieldStyle}>
                    <span style={labelStyle}>{t('Color')}</span>
                    <Select value={addModal.color} style={{ width: '100%' }}
                      onChange={(v) => setAddModal((m) => ({ ...m, color: v }))}
                      options={COLOR_KEYS.map((c) => ({ value: c, label: (<span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: KALKYL_COLORS[c].head, border: '1px solid rgba(0,0,0,0.1)', verticalAlign: 'middle' }} />) }))} />
                  </div>
                </div>
              </div>
            );
          })()
        ) : null}
      </Modal>
    </div>
  );
}

function SummaryPanel({ money, t, income, expense, profit }) {
  const [open, setOpen] = useState(true);
  const costShare = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : (expense > 0 ? 100 : 0);
  const profitShare = income > 0 ? Math.max(0, 100 - costShare) : 0;
  const margin = income > 0 ? Math.round((profit / income) * 100) : null;
  const loss = profit < 0;
  const dot = (color) => (
    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 6, verticalAlign: 'middle' }} />
  );
  return (
    <div style={{ marginTop: 20, border: '1px solid var(--border,#e2e8f0)', borderRadius: 12, padding: '16px 18px' }}>
      <h3 onClick={() => setOpen((o) => !o)}
        style={{ margin: open ? '0 0 4px' : 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', opacity: open ? 1 : 0.5, userSelect: 'none' }}>
        <span style={{ fontSize: 12, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', display: 'inline-block' }}>▸</span>
        {t('Summary')}
      </h3>
      {open ? (
      <>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--muted,#64748b)' }}>
        {t('How the income is split between costs and profit')}
      </p>
      {income > 0 ? (
        <>
          <div style={{ display: 'flex', height: 18, borderRadius: 999, overflow: 'hidden', background: '#eef1f5' }}>
            <div style={{ width: `${costShare}%`, background: RED, transition: 'width .2s' }} title={`${t('Costs')} ${costShare}%`} />
            <div style={{ width: `${profitShare}%`, background: GREEN, transition: 'width .2s' }} title={`${t('Profit')} ${profitShare}%`} />
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 13, flexWrap: 'wrap' }}>
            <span>{dot(RED)}{t('Costs')} <b style={{ fontVariantNumeric: 'tabular-nums' }}>{money(expense)}</b> <span style={{ color: 'var(--muted,#64748b)' }}>({costShare}%)</span></span>
            <span>{dot(GREEN)}{t('Profit')} <b style={{ color: loss ? RED : GREEN, fontVariantNumeric: "tabular-nums" }}>{money(profit)}</b> <span style={{ color: 'var(--muted,#64748b)' }}>({profitShare}%)</span></span>
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted,#64748b)' }}>{t('Add income to see the breakdown')}</p>
      )}
      <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap', fontSize: 14 }}>
        <span>{t('Income')}: <b style={{ fontVariantNumeric: 'tabular-nums' }}>{money(income)}</b></span>
        <span>{t('Margin %')}: <b style={{ color: loss ? RED : GREEN }}>{margin == null ? '—' : `${margin}%`}</b></span>
        <span>{t('Cost share')}: <b>{costShare}%</b></span>
      </div>
      </>
      ) : null}
    </div>
  );
}

function Side({ money, t, title, tables, totals, totalColor, patchTable, moveTable, removeTable, onAdd, onImport, onScan, onScanFiles, scanEnabled, projectRows = [], onCopyProject, onClosePreview }) {
  return (
    <div style={{ flex: '1 1 460px', minWidth: 320, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 12px' }}>{title}</h3>
      {projectRows.length ? (
        <div style={{ background: '#eef1f5', borderRadius: 10, marginBottom: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '8px 10px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span>{t('From the project')} <span style={{ fontSize: 12, color: 'var(--muted,#64748b)', fontWeight: 400 }}>· {t('Read-only')}</span></span>
            <span style={{ display: 'inline-flex', gap: 4 }}>
              {onCopyProject ? (
                <Button size="small" icon={<SnippetsOutlined />} onClick={onCopyProject}>{t('Copy to table')}</Button>
              ) : null}
              {onClosePreview ? (
                <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClosePreview} title={t('Close')} />
              ) : null}
            </span>
          </div>
          <div style={{ overflowX: 'auto', padding: '0 8px 8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--muted,#64748b)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 6px', fontWeight: 600 }}>{t('Description')}</th>
                  <th style={{ padding: '4px 6px', fontWeight: 600, width: 110 }}>{t('Date')}</th>
                  <th style={{ padding: '4px 6px', fontWeight: 600, textAlign: 'right', width: 120 }}>{t('Amount')}</th>
                </tr>
              </thead>
              <tbody>
                {projectRows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '3px 6px' }}>{r.desc}</td>
                    <td style={{ padding: '3px 6px', color: 'var(--muted,#64748b)' }}>{r.date || '—'}</td>
                    <td style={{ padding: '3px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(r.gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {tables.map((tb, i) => (
        <KalkylTable key={tb.id} money={money} t={t} table={tb} isFirst={i === 0} isLast={i === tables.length - 1}
          onChange={(u) => patchTable(tb.id, u)} onMove={(d) => moveTable(tb.id, d)} onRemove={() => removeTable(tb.id)}
          onImport={onImport ? () => onImport(tb.id) : null}
          onScan={scanEnabled && onScan ? () => onScan(tb.id) : null}
          onScanFiles={scanEnabled && onScanFiles ? (files) => onScanFiles(tb.id, files) : null} />
      ))}
      <Button icon={<PlusOutlined />} onClick={onAdd} style={{ marginBottom: 16, alignSelf: 'flex-start' }}>{t('Add table')}</Button>
      <div style={{ marginTop: 'auto', background: totalColor, color: '#fff', borderRadius: 10, padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
        <span>TOTAL</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {money(totals.brutto)}
          {totals.vat > 0 ? <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.9, marginLeft: 8 }}>
            ({t('excl.')} {money(totals.netto)} + {t("VAT")} {money(totals.vat)})</span> : null}
        </span>
      </div>
    </div>
  );
}

function KalkylTable({ money, t, table, isFirst, isLast, onChange, onMove, onRemove, onImport, onScan, onScanFiles }) {
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const palette = KALKYL_COLORS[table.color] || KALKYL_COLORS.grey;
  const tt = tableTotals(table);

  const setCol = (cid, patch) => onChange((tb) => ({ ...tb, columns: tb.columns.map((c) => (c.id === cid ? { ...c, ...patch } : c)) }));
  const colLabelFor = (type) => (type === 'date' ? t('Date') : type === 'number' ? t('Number') : type === 'amount_excl' ? t('excl. VAT') : type === 'vat' ? t('VAT') : t('Text'));
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
        {onScan ? <Button size="small" icon={<ScanOutlined />} onClick={onScan}>{t('Scan')}</Button> : null}
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
        <span className="kalkyl-editable" style={{ flex: 1, minWidth: 130, display: 'flex' }} title={t('Click to rename')}>
          <Input value={table.title} onChange={(e) => onChange((tb) => ({ ...tb, title: e.target.value }))}
            variant="borderless" style={{ fontWeight: 700, flex: 1, background: 'transparent' }} />
        </span>
        {onScan ? <Button size="small" type="text" icon={<ScanOutlined />} onClick={onScan} title={t('Scan receipt into a row')} /> : null}
        <Popover trigger="click" placement="bottomRight" content={settingsContent} title={t('Table settings')}>
          <Button size="small" type="text" icon={<SettingOutlined />} title={t('Table settings')} />
        </Popover>
      </div>

      <div style={{ overflowX: 'auto', padding: '6px 10px 10px 10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'auto' }}>
          <thead>
            <tr>
              {columns.map((c, ci) => {
                const rightAligned = (c.type === 'amount' || c.type === 'number' || c.type === 'amount_excl' || c.type === 'vat');
                const canRemove = c.type !== 'amount' && c.type !== 'text'; // keep Description + Amount
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
                  { key: 'date', label: t('Date'), onClick: () => addCol('date') },
                  { key: 'number', label: t('Number'), onClick: () => addCol('number') },
                  { key: 'vat', label: t('VAT'), onClick: () => addCol('vat') },
                  { key: 'amount_excl', label: t('excl. VAT'), onClick: () => addCol('amount_excl') },
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
    </div>
  );
}
