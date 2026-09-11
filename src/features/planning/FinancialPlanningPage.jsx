'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Card, Empty, InputNumber, Spin, Table, Tag, Tooltip, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { useT } from '@/src/i18n/LanguageProvider';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { formatMoney } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { getEntityId } from '@/src/utils/entityId';
import { useSupplierInvoiceStore } from '@/src/store/supplierInvoiceStore';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import BulkScanInvoiceModal from '@/src/features/purchases/components/BulkScanInvoiceModal';
import PaymentDetailDrawer from '@/src/features/planning/PaymentDetailDrawer';
import { planningSummary, upcomingPayments, upcomingReceipts } from '@/src/features/planning/planningUtils';
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

  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());
  const [balance, setBalance] = useState(0);
  const [leadDays, setLeadDays] = useState(3);
  const [scanOpen, setScanOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState(null);
  const [selected, setSelected] = useState(null);

  const reload = () => Promise.all([fetchSupplier(), fetchInvoices()]);

  useEffect(() => {
    setBalance(getBankBalance());
    setLeadDays(getReminderLeadDays());
    setLoading(true);
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAddButton(() => { setPendingFiles(null); setScanOpen(true); }, 'Scan invoices');

  const payments = useMemo(() => upcomingPayments(supplierInvoices, now), [supplierInvoices, now]);
  const receipts = useMemo(() => upcomingReceipts(customerInvoices, now), [customerInvoices, now]);
  const summary = useMemo(
    () => planningSummary(supplierInvoices, customerInvoices, now, { bankBalance: balance }),
    [supplierInvoices, customerInvoices, now, balance],
  );

  const onBalanceChange = (v) => { const n = Number(v) || 0; setBalance(n); setBankBalance(n); };
  const onLeadChange = (v) => { const n = Math.round(Number(v) || 0); setLeadDays(n); setReminderLeadDays(n); };

  const markPaid = async (id) => {
    await markStatus(id, 'paid');
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

  const apColumns = [
    { title: t('Supplier'), key: 'supplier', render: (_, row) => row.supplierName || '—' },
    { title: t('Due'), key: 'due', render: (_, row) => <DueCell row={row} t={t} /> },
    { title: '', key: 'flag', width: 96, render: (_, row) => toneTag(row) },
    { title: t('OCR'), key: 'ocr', render: (_, row) => (row.ocr ? <span className="planning-ocr">{row.ocr}</span> : '—') },
    { title: t('Amount'), key: 'amount', align: 'right', render: (_, row) => formatMoney(row.total, currency, { decimals: false }) },
  ];

  const arColumns = [
    { title: t('Customer'), key: 'customer', render: (_, row) => row.companyName || row.clientName || '—' },
    { title: t('No.'), key: 'no', width: 70, render: (_, row) => (row.invoiceNumber ? `#${row.invoiceNumber}` : '—') },
    { title: t('Due'), key: 'due', render: (_, row) => <DueCell row={row} t={t} /> },
    { title: '', key: 'flag', width: 96, render: (_, row) => toneTag(row) },
    { title: t('Amount'), key: 'amount', align: 'right', render: (_, row) => formatMoney(row._value, currency, { decimals: false }) },
  ];

  const onDropFiles = (fileList) => { setPendingFiles(fileList); setScanOpen(true); };

  if (loading) return <div className="planning-loading"><Spin /></div>;

  return (
    <div className="planning-page">
      {/* KPI strip */}
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

      {/* Reminder lead + drag&drop intake */}
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
        beforeUpload={(_file, fileList) => { onDropFiles(fileList); return false; }}
      >
        <p style={{ margin: 0 }}><InboxOutlined style={{ fontSize: 26, color: '#0785F4' }} /></p>
        <p style={{ margin: '6px 0 0' }}>{t('Drop invoices from your desktop — pick a project, they are scanned and added')}</p>
      </Dragger>

      <div className="planning-columns">
        <Card
          className="dashboard-section-card"
          title={(
            <span className="dashboard-section-card__headline">
              {t('Upcoming payments')}
              {summary.overdueOut > 0 ? <Tag color="red">{`${formatMoney(summary.overdueOut, currency, { decimals: false })} ${t('overdue')}`}</Tag> : null}
            </span>
          )}
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

        <Card
          className="dashboard-section-card"
          title={(
            <span className="dashboard-section-card__headline">
              {t('Upcoming receipts')}
              {summary.overdueIn > 0 ? <Tag color="orange">{`${formatMoney(summary.overdueIn, currency, { decimals: false })} ${t('overdue')}`}</Tag> : null}
            </span>
          )}
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
      </div>

      <PaymentDetailDrawer
        open={Boolean(selected)}
        record={selected}
        currency={currency}
        onClose={() => setSelected(null)}
        onMarkPaid={markPaid}
        invoicesLink={invoicesLink}
      />

      <BulkScanInvoiceModal
        open={scanOpen}
        initialFiles={pendingFiles}
        onClose={(changed) => { setScanOpen(false); setPendingFiles(null); if (changed) reload(); }}
      />
    </div>
  );
}
