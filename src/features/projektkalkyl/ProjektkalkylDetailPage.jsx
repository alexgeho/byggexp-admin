'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Input, InputNumber, Modal, Popover, Segmented, Select, message } from 'antd';
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
import BankImportModal from '@/src/features/projektkalkyl/BankImportModal';
import { parseAmount, fmtSheetDate } from '@/src/features/projektkalkyl/excelImport';
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
  const [activeSide, setActiveSide] = useState('both'); // view: 'both' (side-by-side) | 'income' | 'expense'
  const [addModal, setAddModal] = useState(null); // { side, title, vatMode, color }
  const [shareModal, setShareModal] = useState(null); // { url, expiresAt }
  const [bankImport, setBankImport] = useState(null); // { tid, file } — bank-file column mapping
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
    setActiveSide('both'); // pulled tables land on the Overview board
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

  // Create a table of the picked shape immediately (one click). VAT/colour/name
  // stay at sensible defaults and are changed later in the table itself (title
  // is inline-editable; VAT + colour live in the table's ⚙) — so the New-table
  // step is just the one real decision: which shape. "excel" = a simple table
  // you fill from a file.
  const createTableOfType = (type) => {
    const { side, title, color, detail } = addModal;
    const isExcel = type === 'excel';
    const table = newTable(side, t, {
      title: title || (isExcel ? t('Bank import') : undefined),
      vatRate: 25, color, type: isExcel ? 'simple' : type, detail,
    });
    setTables((ts) => [...ts, table]);
    setAddModal(null);
    if (isExcel) pickBankFile(table.id);
  };

  // Open the OS file picker and hand the chosen file to the mapping modal for a
  // specific table. Shared by "Add table → From Excel" and a table's ⚙ Import.
  const pickBankFile = (tid) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) setBankImport({ tid, file });
    };
    input.click();
  };

  // A table's ⚙ Import → same file picker + mapping modal.
  const importExcel = (tid) => pickBankFile(tid);

  // Move selected rows out of a table into a fresh table on the same side (same
  // columns). The source table drops them via its own onChange.
  // Re-key moved rows onto a target table's own columns, matched by type and
  // position-within-type (so 2nd text column → 2nd text column, amount → amount…).
  const remapRowsToColumns = (srcCols, targetCols, rowsToMove) => {
    const keyed = (cols) => {
      const seen = {};
      return cols.map((c) => { seen[c.type] = (seen[c.type] || 0) + 1; return `${c.type}#${seen[c.type]}`; });
    };
    const srcKeys = keyed(srcCols);
    const tgtKeys = keyed(targetCols);
    const srcIdByKey = new Map(srcCols.map((c, i) => [srcKeys[i], c.id]));
    return rowsToMove.map((r) => {
      const cells = {};
      targetCols.forEach((tc, i) => {
        const srcId = srcIdByKey.get(tgtKeys[i]);
        if (srcId != null && r.cells?.[srcId] != null) cells[tc.id] = r.cells[srcId];
      });
      const row = { ...newRow(), cells };
      if (Number.isFinite(r.vatRate)) row.vatRate = r.vatRate;
      return row;
    });
  };

  const extractRowsToNewTable = (tid, rowsToMove, cols, targetId = null) => {
    if (!rowsToMove?.length) return;
    setTables((ts) => {
      const src = ts.find((x) => x.id === tid);
      if (!src) return ts;
      // Append into an existing table, remapping columns.
      if (targetId) {
        const target = ts.find((x) => x.id === targetId);
        if (!target) return ts;
        const newRows = remapRowsToColumns(cols, target.columns, rowsToMove);
        return ts.map((x) => (x.id === targetId ? { ...x, rows: [...(x.rows || []), ...newRows] } : x));
      }
      // Or spin up a fresh table with the same columns.
      const sideTables = ts.filter((x) => x.side === src.side);
      const tbl = newTable(src.side, t, { title: t('Group'), vatRate: src.vatRate, color: nextColor(sideTables), type: 'simple', detail: src.detail });
      tbl.columns = cols;
      tbl.rows = rowsToMove;
      return [...ts, tbl];
    });
  };

  // Import the whole bank file: every kept column becomes a table column (typed
  // amount/date/number/text so totals still work) and the rows fill in. Replaces
  // the (freshly created) table's columns/rows.
  const applyBankImport = (tid, { columns, rows, expense }) => {
    if (!columns?.length || !rows?.length) { message.warning(t('No rows found in the file')); return; }
    const cols = columns.map((c) => newColumn(c.label, c.type));
    const built = columns.map((c, k) => ({ src: c.index, type: c.type, id: cols[k].id }));
    const outRows = [];
    for (const raw of rows) {
      const cells = {};
      let any = false;
      for (const b of built) {
        let v = raw[b.src];
        if (b.type === 'amount' || b.type === 'number') {
          v = parseAmount(v);
          if (b.type === 'amount' && expense && v != null) v = Math.abs(v);
        } else if (b.type === 'date') {
          v = fmtSheetDate(v);
        } else {
          v = String(v ?? '').trim();
        }
        if (v !== '' && v != null) any = true;
        cells[b.id] = v;
      }
      if (any) outRows.push({ ...newRow(), cells });
    }
    patchTable(tid, (tb) => ({ ...tb, columns: cols, rows: outRows }));
    message.success(t('Imported {n} rows').replace('{n}', outRows.length));
    setBankImport(null);
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
  // Overview = the simple two-column board; detail tabs = the longer per-side
  // sheets (more columns). Both count toward the totals — this only decides where
  // each table is shown.
  const overviewIncome = incomeTables.filter((x) => !x.detail);
  const overviewExpense = expenseTables.filter((x) => !x.detail);
  const detailIncome = incomeTables.filter((x) => x.detail);
  const detailExpense = expenseTables.filter((x) => x.detail);
  // Move a table between the Overview board and its side's detail sheet.
  const toggleDetail = (tid) => patchTable(tid, (tb) => ({ ...tb, detail: !tb.detail }));

  // Next palette colour, cycling after the last table on that side so each new
  // table gets a fresh colour in turn.
  const nextColor = (arr) => {
    // Yellow is a manual-only choice — never auto-assigned as a table's default.
    const pool = COLOR_KEYS.filter((c) => c !== 'yellow');
    const i = pool.indexOf(arr[arr.length - 1]?.color);
    return pool[(i + 1) % pool.length];
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

      {/* View switch. "Overview" keeps the original side-by-side layout (income
          left / expenses right). The single-side tabs give each board the FULL
          page width so extra columns fit (the halves squeezed them). */}
      <Segmented
        size="large"
        value={activeSide}
        onChange={setActiveSide}
        style={{ marginBottom: 16 }}
        options={[
          { value: 'both', label: t('Overview') },
          { value: 'income', label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {t('Income')}
              <b style={{ color: GREEN, fontVariantNumeric: 'tabular-nums' }}>{money(incomeTotals.brutto)}</b>
            </span>
          ) },
          { value: 'expense', label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {t('Expenses')}
              <b style={{ color: RED, fontVariantNumeric: 'tabular-nums' }}>{money(expenseTotals.brutto)}</b>
            </span>
          ) },
        ]}
      />

      {activeSide === 'both' ? (
        <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: 'wrap' }}>
          <Side money={money} t={t} title={t('Income')} allTables={tables}
            tables={overviewIncome} totals={incomeTotals} totalColor={GREEN}
            detailTables={detailIncome} onShowDetail={() => setActiveSide('income')}
            onScan={scanIntoTable} onScanFiles={scanFilesIntoTable} scanEnabled={scanEnabled}
            patchTable={patchTable} moveTable={moveTable} removeTable={removeTable} onExtractRows={extractRowsToNewTable} onToggleDetail={toggleDetail}
            onAdd={() => setAddModal({ side: 'income', title: '', vatRate: 25, color: nextColor(overviewIncome), type: 'simple', detail: false })} />
          <Side money={money} t={t} title={t('Expenses')} allTables={tables}
            tables={overviewExpense} totals={expenseTotals} totalColor={RED}
            detailTables={detailExpense} onShowDetail={() => setActiveSide('expense')}
            onScan={scanIntoTable} onScanFiles={scanFilesIntoTable} scanEnabled={scanEnabled}
            patchTable={patchTable} moveTable={moveTable} removeTable={removeTable} onImport={importExcel} onExtractRows={extractRowsToNewTable} onToggleDetail={toggleDetail}
            onAdd={() => setAddModal({ side: 'expense', title: '', vatRate: 25, color: nextColor(overviewExpense), type: 'simple', detail: false })} />
        </div>
      ) : (
        <div style={{ display: 'flex' }}>
          {activeSide === 'income' ? (
            <Side money={money} t={t} allTables={tables}
              tables={detailIncome} totals={incomeTotals} totalColor={GREEN}
              onScan={scanIntoTable} onScanFiles={scanFilesIntoTable} scanEnabled={scanEnabled}
              patchTable={patchTable} moveTable={moveTable} removeTable={removeTable} onExtractRows={extractRowsToNewTable} onToggleDetail={toggleDetail}
              onAdd={() => setAddModal({ side: 'income', title: '', vatRate: 25, color: nextColor(detailIncome), type: 'simple', detail: true })} />
          ) : (
            <Side money={money} t={t} allTables={tables}
              tables={detailExpense} totals={expenseTotals} totalColor={RED}
              onScan={scanIntoTable} onScanFiles={scanFilesIntoTable} scanEnabled={scanEnabled}
              patchTable={patchTable} moveTable={moveTable} removeTable={removeTable} onImport={importExcel} onExtractRows={extractRowsToNewTable} onToggleDetail={toggleDetail}
              onAdd={() => setAddModal({ side: 'expense', title: '', vatRate: 25, color: nextColor(detailExpense), type: 'simple', detail: true })} />
          )}
        </div>
      )}

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

      <Modal open={Boolean(addModal)} onCancel={() => setAddModal(null)} footer={null}
        title={t('New table')} destroyOnHidden width={460}>
        {addModal ? (
          (() => {
            const TYPES = [
              { value: 'excel', icon: '📄', label: t('From Excel'), desc: t('Upload a bank file') },
              { value: 'simple', icon: '≡', label: t('Simple'), desc: t('Type the amount') },
              { value: 'vat', icon: '%', label: t('With VAT'), desc: t('Amount → VAT → excl.') },
              { value: 'qty', icon: '×', label: t('Qty × price'), desc: t('Multiply qty by price') },
            ];
            // Name + colour up top (optional); a click on a tile creates the
            // table (Excel also opens the file picker). VAT defaults to 25% and
            // is changed later in the table's ⚙.
            const labelStyle = { display: 'block', fontSize: 13, color: 'var(--muted,#64748b)', marginBottom: 4 };
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={labelStyle}>{t('Name')}</span>
                    <Input value={addModal.title} placeholder={t('New table')}
                      onChange={(e) => setAddModal((m) => ({ ...m, title: e.target.value }))} />
                  </div>
                  <div style={{ width: 72 }}>
                    <span style={labelStyle}>{t('Color')}</span>
                    <Select value={addModal.color} style={{ width: '100%' }}
                      onChange={(v) => setAddModal((m) => ({ ...m, color: v }))}
                      options={COLOR_KEYS.map((c) => ({ value: c, label: (<span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: KALKYL_COLORS[c].head, border: '1px solid rgba(0,0,0,0.1)', verticalAlign: 'middle' }} />) }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TYPES.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => createTableOfType(opt.value)}
                    style={{
                      textAlign: 'left', cursor: 'pointer', borderRadius: 10, padding: '12px 14px',
                      border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff',
                      display: 'flex', gap: 10, alignItems: 'center', transition: 'border-color .12s, background .12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-color,#0785f4)'; e.currentTarget.style.background = 'rgba(7,133,244,0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.background = '#fff'; }}
                  >
                    <span style={{ fontSize: 20, width: 24, textAlign: 'center' }}>{opt.icon}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted,#64748b)' }}>{opt.desc}</span>
                    </span>
                  </button>
                ))}
                </div>
              </div>
            );
          })()
        ) : null}
      </Modal>

      <BankImportModal
        open={Boolean(bankImport)}
        file={bankImport?.file}
        t={t}
        tableTitle={tables.find((tb) => tb.id === bankImport?.tid)?.title}
        expense={tables.find((tb) => tb.id === bankImport?.tid)?.side !== 'income'}
        onCancel={() => setBankImport(null)}
        onImport={(payload) => applyBankImport(bankImport.tid, payload)}
      />
    </div>
  );
}
