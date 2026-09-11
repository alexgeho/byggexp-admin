'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button, Card, Empty, InputNumber, Spin, Table, Tag, Tooltip, Upload } from 'antd';
import { DeleteOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { useT } from '@/src/i18n/LanguageProvider';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { formatMoney } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { getEntityId } from '@/src/utils/entityId';
import { useSupplierInvoiceStore } from '@/src/store/supplierInvoiceStore';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { usePlanningStore } from '@/src/store/planningStore';
import BulkScanInvoiceModal from '@/src/features/purchases/components/BulkScanInvoiceModal';
import BulkPlanningModal from '@/src/features/planning/BulkPlanningModal';
import CashflowBlock from '@/src/features/dashboard/CashflowBlock';
import PaymentDetailDrawer from '@/src/features/planning/PaymentDetailDrawer';
import BlockGrid from '@/src/shared/components/blocks/BlockGrid';
import BlockCustomizer from '@/src/shared/components/blocks/BlockCustomizer';
import { useBlockLayout } from '@/src/shared/components/blocks/useBlockLayout';
import { PLANNING_BLOCKS, PLANNING_BLOCK_KEYS, PLANNING_BLOCK_MAP } from '@/src/features/planning/planningBlocks';
import { planningSummary, upcomingPayments, upcomingReceipts, manualToSupplier, manualToCustomer } from '@/src/features/planning/planningUtils';
import { getBankBalance, setBankBalance, getReminderLeadDays, setReminderLeadDays } from '@/src/features/planning/reminderPrefs';
import './FinancialPlanningPage.scss';

const { Dragger } = Upload;

const TONE_TAG = {
  overdue: { color: 'red', label: 'Overdue' },
  soon: { color: 'orange', label: 'Due soon' },
};

const DueCell = ({ row, t }) => (
  <span className={`payments-due__date payments-due__date--${row._tone}`}>
    {formatAdminDate(row.dueDate)}
    {row._days != null ? (
      <span className="planning-days">
        {row._days < 0 ? ` (${Math.abs(row._days)} ${t('d overdue')})`
          : row._days === 0 ? ` (${t('today')})`
            : ` (${row._days} ${t('d')})`}
      </span>
    ) : null}
  </span>
);

export default function FinancialPlanningPage() {
  const t = useT();
  const currency = useCompanyCurrency();
  const pathname = usePathname();
  // Match the tree we're rendered under (/company or /admin) so the AR drawer's
  // "Open in Invoices" link stays inside the same section.
  const invoicesLink = pathname?.startsWith('/admin')
    ? '/admin/invoicing/invoices'
    : '/company/invoicing/invoices';
  const supplierInvoices = useSupplierInvoiceStore((s) => s.invoices);
  const fetchSupplier = useSupplierInvoiceStore((s) => s.fetchAll);
  const markStatus = useSupplierInvoiceStore((s) => s.updateStatus);
  const customerInvoices = useInvoiceStore((s) => s.invoices);
  const fetchInvoices = useInvoiceStore((s) => s.fetchAllAccessible);
  const sendReminder = useInvoiceStore((s) => s.sendReminder);
  const entries = usePlanningStore((s) => s.entries);
  const fetchEntries = usePlanningStore((s) => s.fetchAll);
  const removeEntry = usePlanningStore((s) => s.remove);

  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());
  const [balance, setBalance] = useState(0);
  const [leadDays, setLeadDays] = useState(3);
  const [scanOpen, setScanOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState(null);
  const [selected, setSelected] = useState(null);
  const [addModal, setAddModal] = useState(null); // { direction: 'in'|'out' }
  const layout = useBlockLayout({ blockKeys: PLANNING_BLOCK_KEYS, storageKey: 'byggexp.planning.layout.v1' });

  const reload = () => Promise.all([fetchSupplier(), fetchInvoices(), fetchEntries()]);

  useEffect(() => {
    setBalance(getBankBalance());
    setLeadDays(getReminderLeadDays());
    setLoading(true);
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAddButton(() => { setPendingFiles(null); setScanOpen(true); }, 'Scan invoices');

  // Manual entries are merged in as pseudo-invoices so they appear in the lists,
  // the forecast and the KPIs exactly like real invoices.
  const allSupplier = useMemo(() => [...supplierInvoices, ...manualToSupplier(entries)], [supplierInvoices, entries]);
  const allCustomer = useMemo(() => [...customerInvoices, ...manualToCustomer(entries)], [customerInvoices, entries]);

  const payments = useMemo(() => upcomingPayments(allSupplier, now), [allSupplier, now]);
  const receipts = useMemo(() => upcomingReceipts(allCustomer, now), [allCustomer, now]);
  const summary = useMemo(
    () => planningSummary(allSupplier, allCustomer, now, { bankBalance: balance }),
    [allSupplier, allCustomer, now, balance],
  );

  const deleteEntry = async (id) => { await removeEntry(id); setSelected(null); };

  const onBalanceChange = (v) => { const n = Number(v) || 0; setBalance(n); setBankBalance(n); };
  const onLeadChange = (v) => { const n = Math.round(Number(v) || 0); setLeadDays(n); setReminderLeadDays(n); };

  const markPaid = async (id) => {
    await markStatus(id, 'paid');
    setSelected(null);
    reload();
  };

  const remindReceivable = async (id) => {
    await sendReminder(id, {});
    setSelected(null);
    reload();
  };

  const tiles = [
    { key: 'balance', label: t('Bank balance'), editable: true },
    { key: 'pay', label: `${t('To pay')} (${summary.horizonDays} ${t('d')})`, value: summary.payHorizon, tone: 'out' },
    { key: 'receive', label: `${t('To receive')} (${summary.horizonDays} ${t('d')})`, value: summary.receiveHorizon, tone: 'in' },
    { key: 'projected', label: t('Projected balance'), value: summary.projectedBalance, tone: summary.projectedBalance < 0 ? 'bad' : 'good' },
    { key: 'overdueOut', label: t('Overdue to pay'), value: summary.overdueOut, tone: summary.overdueOut > 0 ? 'bad' : 'muted' },
    { key: 'overdueIn', label: t('Overdue to collect'), value: summary.overdueIn, tone: summary.overdueIn > 0 ? 'warn' : 'muted' },
  ];

  const toneTag = (row) => {
    const tag = TONE_TAG[row._tone];
    return tag ? <Tag color={tag.color}>{t(tag.label)}</Tag> : null;
  };

  const deleteCol = {
    title: '',
    key: 'del',
    width: 40,
    render: (_, row) => (row._manual ? (
      <Button
        type="text"
        size="small"
        danger
        icon={<DeleteOutlined />}
        onClick={(e) => { e.stopPropagation(); deleteEntry(getEntityId(row)); }}
        title={t('Delete')}
      />
    ) : null),
  };

  const apColumns = [
    { title: t('Supplier'), key: 'supplier', render: (_, row) => (<span>{row.supplierName || '—'}{row._manual ? <Tag style={{ marginLeft: 6 }}>{t('Manual')}</Tag> : null}</span>) },
    { title: t('Due'), key: 'due', render: (_, row) => <DueCell row={row} t={t} /> },
    { title: '', key: 'flag', width: 96, render: (_, row) => toneTag(row) },
    { title: t('OCR'), key: 'ocr', render: (_, row) => (row.ocr ? <span className="planning-ocr">{row.ocr}</span> : '—') },
    { title: t('Amount'), key: 'amount', align: 'right', render: (_, row) => formatMoney(row.total, currency, { decimals: false }) },
    deleteCol,
  ];

  const arColumns = [
    { title: t('Customer'), key: 'customer', render: (_, row) => (<span>{row.companyName || row.clientName || '—'}{row._manual ? <Tag style={{ marginLeft: 6 }}>{t('Manual')}</Tag> : null}</span>) },
    { title: t('No.'), key: 'no', width: 70, render: (_, row) => (row.invoiceNumber ? `#${row.invoiceNumber}` : '—') },
    { title: t('Due'), key: 'due', render: (_, row) => <DueCell row={row} t={t} /> },
    { title: '', key: 'flag', width: 96, render: (_, row) => toneTag(row) },
    { title: t('Amount'), key: 'amount', align: 'right', render: (_, row) => formatMoney(row._value, currency, { decimals: false }) },
    deleteCol,
  ];

  // Ant's Dragger fires beforeUpload once PER file (each with the full list), so
  // collect the whole drop into a ref and flush it once on the next microtask —
  // otherwise a 2-file drop would open the modal with duplicated files.
  const dropBatch = useRef([]);
  const onDropFile = (file) => {
    dropBatch.current.push(file);
    queueMicrotask(() => {
      if (!dropBatch.current.length) return;
      const files = dropBatch.current;
      dropBatch.current = [];
      setPendingFiles(files);
      setScanOpen(true);
    });
  };

  if (loading) return <div className="planning-loading"><Spin /></div>;

  const blockContent = {
    kpis: (
      <div className="planning-kpis">
        {tiles.map((tile) => (
          <div key={tile.key} className={`planning-kpi planning-kpi--${tile.tone || 'default'}`}>
            <span className="planning-kpi__label">{tile.label}</span>
            {tile.editable ? (
              <InputNumber
                className="planning-kpi__input"
                value={balance}
                onChange={onBalanceChange}
                controls={false}
                variant="borderless"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={(v) => `${v}`.replace(/\s/g, '')}
                addonAfter={currency}
              />
            ) : (
              <strong className="planning-kpi__value">{formatMoney(tile.value, currency, { decimals: false })}</strong>
            )}
          </div>
        ))}
      </div>
    ),
    intake: (
      <div className="planning-intake">
        <div className="planning-toolbar">
          <span className="planning-reminder">
            {t('Remind me')}
            <InputNumber min={0} max={14} value={leadDays} onChange={onLeadChange} size="small" style={{ width: 64, margin: '0 8px' }} />
            {t('days before a payment is due')}
            <Tooltip title={t('Upcoming payments appear in the bell this many days before their due date.')}>
              <span className="planning-reminder__hint"> ⓘ</span>
            </Tooltip>
          </span>
        </div>
        <Dragger
          className="planning-dropzone"
          accept="image/*,application/pdf"
          multiple
          showUploadList={false}
          beforeUpload={(file) => { onDropFile(file); return false; }}
        >
          <p style={{ margin: 0 }}><InboxOutlined style={{ fontSize: 26, color: '#0785F4' }} /></p>
          <p style={{ margin: '6px 0 0' }}>{t('Drop invoices from your desktop — pick a project, they are scanned and added')}</p>
        </Dragger>
      </div>
    ),
    liquidity: (
      <CashflowBlock
        data={{ invoices: allCustomer, supplier: allSupplier, expenses: [] }}
        loading={false}
        failed={false}
        now={now}
        weeks={13}
        startingBalance={balance}
        title={t('Liquidity forecast')}
      />
    ),
    payables: (
      <Card
        className="dashboard-section-card"
        title={(
          <span className="dashboard-section-card__headline">
            {t('Upcoming payments')}
            {summary.overdueOut > 0 ? <Tag color="red">{`${formatMoney(summary.overdueOut, currency, { decimals: false })} ${t('overdue')}`}</Tag> : null}
          </span>
        )}
        extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setAddModal({ direction: 'out' })}>{t('Add')}</Button>}
      >
        {payments.length ? (
          <Table
            className="dashboard-overview__table planning-table"
            columns={apColumns}
            dataSource={payments}
            pagination={payments.length > 12 ? { pageSize: 12, hideOnSinglePage: true } : false}
            rowKey={(row) => getEntityId(row) || `${row.supplierName}-${row.dueDate}`}
            size="small"
            onRow={(row) => ({ onClick: () => setSelected({ ...row, _kind: 'ap' }) })}
            rowClassName="planning-row"
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Nothing to pay')} />
        )}
      </Card>
    ),
    receivables: (
      <Card
        className="dashboard-section-card"
        title={(
          <span className="dashboard-section-card__headline">
            {t('Upcoming receipts')}
            {summary.overdueIn > 0 ? <Tag color="orange">{`${formatMoney(summary.overdueIn, currency, { decimals: false })} ${t('overdue')}`}</Tag> : null}
          </span>
        )}
        extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setAddModal({ direction: 'in' })}>{t('Add')}</Button>}
      >
        {receipts.length ? (
          <Table
            className="dashboard-overview__table planning-table"
            columns={arColumns}
            dataSource={receipts}
            pagination={receipts.length > 12 ? { pageSize: 12, hideOnSinglePage: true } : false}
            rowKey={(row) => getEntityId(row) || `${row.invoiceNumber}-${row.dueDate}`}
            size="small"
            onRow={(row) => ({ onClick: () => setSelected({ ...row, _kind: 'ar' }) })}
            rowClassName="planning-row"
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Nothing to collect')} />
        )}
      </Card>
    ),
  };

  return (
    <div className="planning-page">
      <div className="planning-head">
        <BlockCustomizer blocks={PLANNING_BLOCKS} layout={layout} title={t('Customize page')} />
      </div>

      <BlockGrid layout={layout} blockMap={PLANNING_BLOCK_MAP} content={blockContent} gap={16} />

      <PaymentDetailDrawer
        open={Boolean(selected)}
        record={selected}
        currency={currency}
        onClose={() => setSelected(null)}
        onMarkPaid={markPaid}
        onSendReminder={remindReceivable}
        invoicesLink={invoicesLink}
      />

      <BulkScanInvoiceModal
        open={scanOpen}
        initialFiles={pendingFiles}
        onClose={(changed) => { setScanOpen(false); setPendingFiles(null); if (changed) reload(); }}
      />

      <BulkPlanningModal
        open={Boolean(addModal)}
        direction={addModal?.direction}
        currency={currency}
        onClose={(changed) => { setAddModal(null); if (changed) reload(); }}
      />
    </div>
  );
}
