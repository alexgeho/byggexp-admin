'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Input, InputNumber, Modal, Popover, Select, message } from 'antd';
import {
  ArrowLeftOutlined, ArrowUpOutlined, ArrowDownOutlined, CloseOutlined, DeleteOutlined, DownOutlined, RightOutlined,
  DownloadOutlined, FileExcelOutlined, FilePdfOutlined, MoreOutlined, PlusOutlined, SaveOutlined, ScanOutlined, SettingOutlined, ShareAltOutlined, SnippetsOutlined, UploadOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, useParams } from '@/src/shared/routing/routerCompat';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { getEntityId, matchesEntityId } from '@/src/utils/entityId';
import { formatMoney } from '@/src/utils/formatCurrency';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { useProjektkalkylStore } from '@/src/store/projektkalkylStore';
import CommentsPanel from '@/src/features/projektkalkyl/CommentsPanel';
import {
  KALKYL_COLORS, COLOR_KEYS, VAT_RATES, nearestVatRate, newColumn, newRow, newTable, dateLabel, migrateDateLabels,
  sideTotals, moveInArray, amountIsGross,
} from '@/src/features/projektkalkyl/kalkylModel';
import { parseExcelExpenses } from '@/src/features/projektkalkyl/excelImport';
import { exportKalkylToExcel } from '@/src/features/projektkalkyl/excelExport';
import { fillRows, GREEN, RED } from '@/src/features/projektkalkyl/kalkylTableUtils';
import Side from '@/src/features/projektkalkyl/Side';
import SummaryPanel from '@/src/features/projektkalkyl/SummaryPanel';
import '@/src/features/projektkalkyl/projektkalkyl.scss';

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
  // Real project data grouped by category so the user can pull exactly what they
  // want (e.g. only salaries) instead of everything at once.
  const [projActuals, setProjActuals] = useState({ invoices: [], supplier: [], expenses: [], salaries: [] });
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
        setTables(migrateDateLabels(Array.isArray(k.tables) ? k.tables : [], t));
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
    if (!projectId) { setProjActuals({ invoices: [], supplier: [], expenses: [], salaries: [] }); return undefined; }
    let alive = true;
    const belongs = (r) => matchesEntityId({ _id: (typeof r.projectId === 'object' ? r.projectId?._id : r.projectId) }, projectId);
    Promise.all([
      apiClient.get('/invoices').then((r) => r.data).catch(() => []),
      apiClient.get('/supplier-invoices').then((r) => r.data).catch(() => []),
      apiClient.get('/expenses').then((r) => r.data).catch(() => []),
      apiClient.get('/payroll').then((r) => r.data).catch(() => []),
    ]).then(([inv, sup, exp, pay]) => {
      if (!alive) return;
      // Use the due date (förfallodatum) as the cash-flow date — that's when the
      // money actually moves — falling back to the invoice/issue date.
      const income = (inv || []).filter((i) => ['sent', 'overdue', 'paid'].includes(i.status) && belongs(i)).map((i) => ({
        desc: `${i.companyName || '—'}${i.invoiceNumber ? ` #${i.invoiceNumber}` : ''}`,
        date: i.dueDate || i.date || '',
        gross: Number(i.roundedTotal ?? i.total) || 0,
        net: Number(i.subtotal ?? ((Number(i.total) || 0) - (Number(i.vat) || 0))) || 0,
      }));
      const expSup = (sup || []).filter(belongs).map((s) => ({
        desc: s.supplierName || '—', date: s.dueDate || s.invoiceDate || '', gross: Number(s.total) || 0, net: Number(s.amountExclVat) || 0,
      }));
      const expExp = (exp || []).filter((e) => ['approved', 'reimbursed'].includes(e.status) && belongs(e)).map((e) => ({
        desc: e.supplierName || '—', date: e.dueDate || e.date || '', gross: Number(e.amount) || 0, net: (Number(e.amount) || 0) - (Number(e.vat) || 0),
      }));
      // Payroll = full labour cost to the company (gross + arbetsgivaravgift),
      // momsfri (no VAT). One row per approved/paid run. Payroll runs are usually
      // company-wide (no projectId), so include both this project's runs and the
      // unassigned ones.
      const expSal = (pay || []).filter((p) => ['approved', 'paid'].includes(p.status) && (belongs(p) || !p.projectId)).map((p) => {
        const cost = Number(p.totalEmployerCost) || Number(p.totalGross) || 0;
        return {
          desc: `${t('Salaries')} ${p.periodFrom || ''}${p.periodTo ? `–${p.periodTo}` : ''}`.trim(),
          date: (p.paidAt ? String(p.paidAt).slice(0, 10) : '') || p.periodTo || '',
          gross: cost, net: cost,
        };
      });
      setProjActuals({ invoices: income, supplier: expSup, expenses: expExp, salaries: expSal });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // The categories that can be pulled from a project, each into its own editable
  // table. Counts come from projActuals; the user picks exactly what they need.
  const pullCategories = [
    { key: 'invoices', side: 'income', color: 'yellow', label: t('Customer invoices') },
    { key: 'supplier', side: 'expense', color: 'blue', label: t('Supplier invoices') },
    { key: 'expenses', side: 'expense', color: 'orange', label: t('Expenses') },
    { key: 'salaries', side: 'expense', color: 'purple', label: t('Salaries') },
  ];

  // Pull ONE category from the project into a new editable table (gross-mode, with
  // computed VAT + excl.-VAT columns) so it can be edited and saved in the calc.
  const pullCategory = (cat) => {
    const rows = projActuals[cat.key] || [];
    if (!rows.length) return;
    const descC = newColumn(t('Description'), 'text');
    const dateC = newColumn(dateLabel(t, cat.side), 'date');
    const amtC = newColumn(t('Amount'), 'amount');
    const vatC = newColumn(t('VAT'), 'vat');
    const exclC = newColumn(t('excl. VAT'), 'amount_excl');
    const tableRows = rows.map((r) => {
      const gross = Number(r.gross) || 0;
      const net = Number(r.net) || 0;
      const pct = net > 0 ? ((gross - net) / net) * 100 : 0;
      return { ...newRow(), vatRate: nearestVatRate(pct), cells: { [descC.id]: r.desc, [dateC.id]: r.date, [amtC.id]: gross } };
    });
    const tb = newTable(cat.side, t, {
      title: `${cat.label} · ${linkedProjectName}`,
      color: cat.color,
      columns: [descC, dateC, amtC, vatC, exclC],
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
          return { ...tb, rows: fillRows(tb, rows) };
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
    const rate = net > 0 ? nearestVatRate((vat / net) * 100) : undefined;
    const cells = {};
    if (descCol) cells[descCol.id] = data.supplierName || '';
    if (dateCol) cells[dateCol.id] = data.dueDate || data.date || '';
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
        patchTable(tid, (tb) => ({ ...tb, rows: fillRows(tb, ok.map((data) => rowFromScan(tb, data))) }));
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
          style={{ maxWidth: 200, fontWeight: 600 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--muted,#64748b)', whiteSpace: 'nowrap' }}>{t('Pull from project')}</span>
          <Select
            size="large"
            allowClear
            showSearch
            optionFilterProp="label"
            value={projectId || undefined}
            onChange={(v) => setProjectId(v || null)}
            title={t('Pick a project, then choose what to pull in')}
            placeholder={t('Select a project…')}
            style={{ minWidth: 220 }}
            options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))}
          />
        </span>
        {projectId ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--muted,#64748b)', whiteSpace: 'nowrap' }}>{t('Add:')}</span>
            {pullCategories.map((c) => {
              const n = (projActuals[c.key] || []).length;
              return (
                <Button key={c.key} size="large" icon={<PlusOutlined />} disabled={!n} onClick={() => pullCategory(c)}
                  title={n ? t('Add to the board') : t('Nothing to add')}>
                  <span style={{ color: KALKYL_COLORS[c.color].head }}>●</span> {c.label} ({n})
                </Button>
              );
            })}
          </span>
        ) : null}
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
          onScan={scanIntoTable} onScanFiles={scanFilesIntoTable} scanEnabled={scanEnabled}
          patchTable={patchTable} moveTable={moveTable} removeTable={removeTable}
          onAdd={() => setAddModal({ side: 'income', title: '', vatRate: 25, color: nextColor(incomeTables), type: 'simple' })} />
        <Side money={money} t={t} title={t('Expenses')} tables={expenseTables} totals={expenseTotals} totalColor={RED}
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
