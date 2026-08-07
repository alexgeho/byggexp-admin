import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  MailOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import StatusTag from '@/src/shared/components/StatusTag';
import { statusLabel } from '@/src/shared/statusRegistry';
import SieExportButton from '@/src/features/invoicing/components/SieExportButton';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { downloadInvoicePdf } from '@/src/features/invoicing/invoicePdf';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];


const todayStr = () => new Date().toISOString().slice(0, 10);

// A "sent" invoice whose due date has passed reads as overdue immediately in the
// UI; the backend cron persists the same flip within the hour. dueDate is a
// plain YYYY-MM-DD string, so the string comparison is a valid date check.
const effectiveStatus = (invoice) => {
  const status = String(invoice?.status || 'draft').toLowerCase();
  if (status === 'sent' && invoice?.dueDate && invoice.dueDate < todayStr()) {
    return 'overdue';
  }
  return status;
};

export default function InvoiceListPage() {
  const {
    invoices, loading, fetchAllAccessible, remove, copy, updateStatus, createCreditNote, sendByEmail,
  } = useInvoiceStore();
  const emptySendModal = { open: false, invoice: null, email: '', message: '', sending: false };
  const [sendModal, setSendModal] = useState(emptySendModal);
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAllAccessible();
  }, [fetchAllAccessible]);

  useAddButton(() => navigate('new'), 'Add invoice');

  const statusFilterOptions = useMemo(() => {
    const countByStatus = invoices.reduce((accumulator, invoice) => {
      const status = effectiveStatus(invoice);
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    return [
      { value: 'all', label: t('All'), count: invoices.length },
      { value: 'draft', label: t('Drafts'), count: countByStatus.draft || 0 },
      { value: 'sent', label: t('Sent'), count: countByStatus.sent || 0 },
      { value: 'overdue', label: t('Overdue'), count: countByStatus.overdue || 0 },
      { value: 'paid', label: t('Paid'), count: countByStatus.paid || 0 },
    ];
  }, [invoices, t]);

  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') {
      return invoices;
    }

    return invoices.filter((invoice) => effectiveStatus(invoice) === statusFilter);
  }, [invoices, statusFilter]);

  const downloadPdf = (invoice) => downloadInvoicePdf(invoice);

  const columns = useMemo(() => [
    {
      title: t('No.'),
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 90,
      sorter: (a, b) => Number(a.invoiceNumber || 0) - Number(b.invoiceNumber || 0),
    },
    {
      title: t('Customer'),
      dataIndex: 'companyName',
      key: 'companyName',
      render: (value) => value || '-',
    },
    {
      title: t('Date'),
      dataIndex: 'date',
      key: 'date',
      render: formatAdminDate,
    },
    {
      title: t('Due'),
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: formatAdminDate,
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (_value, record) => {
        const status = effectiveStatus(record);
        return <StatusTag status={status} upper />;
      },
    },
    {
      title: t('OCR'),
      dataIndex: 'ocr',
      key: 'ocr',
      render: (value) => value || '-',
    },
    {
      title: t('Total'),
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (value) => `${formatAmount(value)} SEK`,
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            // A sent/paid invoice is a booked record — only drafts can be edited.
            String(record?.status || 'draft') === 'draft' && {
              key: 'edit',
              label: t('Edit'),
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => navigate(`${getEntityId(record)}/edit`),
            },
            {
              key: 'download',
              label: t('Download'),
              icon: <DownloadOutlined />,
              onClick: () => downloadPdf(record),
            },
            {
              key: 'send',
              label: t('Send by email'),
              icon: <MailOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => setSendModal({
                open: true,
                invoice: record,
                email: record.email || record.clientEmail || '',
                message: t('Thank you for your business! Please pay the invoice by the due date. Contact us if you have any questions.'),
                sending: false,
              }),
            },
            {
              key: 'copy',
              label: t('Copy'),
              icon: <CopyOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => copy(getEntityId(record)),
            },
            !['paid', 'cancelled'].includes(effectiveStatus(record)) && {
              key: 'mark-paid',
              label: t('Mark as paid'),
              icon: <CheckCircleOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => updateStatus(getEntityId(record), 'paid'),
            },
            // Correct a booked invoice with a credit note instead of editing it.
            !['draft', 'cancelled'].includes(String(record?.status || 'draft')) && !record?.creditOfNumber && {
              key: 'credit',
              label: t('Create credit note'),
              icon: <RollbackOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: async () => {
                const note = await createCreditNote(getEntityId(record));
                if (note) navigate(`${getEntityId(note)}/edit`);
              },
            },
            {
              key: 'change-status',
              label: t('Change status'),
              roles: ['superadmin', 'companyAdmin'],
              children: STATUS_OPTIONS.map((statusOption) => ({
                key: `status-${statusOption.value}`,
                label: statusLabel(statusOption.value, lang),
                disabled: String(record?.status || 'draft') === statusOption.value,
                onClick: () => updateStatus(getEntityId(record), statusOption.value),
              })),
            },
            // Deleting is only allowed for drafts, to keep the number series gap-free.
            String(record?.status || 'draft') === 'draft' && {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: t('Delete invoice?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [copy, createCreditNote, navigate, remove, updateStatus, t, lang]);

  return (
    <>
      <AdminTable
        dataSource={filteredInvoices}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 1240 }}
        statusFilter={(
          <StatusPills
            options={statusFilterOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        )}
      />
      <SieExportButton />


      <AdminModal
        title={sendModal.invoice ? `${t('Send invoice by email')} #${sendModal.invoice.invoiceNumber}` : t('Send invoice by email')}
        open={sendModal.open}
        onCancel={() => setSendModal(emptySendModal)}
        saveText={t('Send')}
        confirmLoading={sendModal.sending}
        onSave={async () => {
          setSendModal((s) => ({ ...s, sending: true }));
          try {
            await sendByEmail(getEntityId(sendModal.invoice), {
              email: sendModal.email.trim(),
              message: sendModal.message,
            });
            setSendModal(emptySendModal);
          } catch {
            setSendModal((s) => ({ ...s, sending: false }));
          }
        }}
        width={560}
      >
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, color: 'var(--muted, #64748b)', marginTop: 4 }}>{t('Recipient email')}</label>
          <input
            type="email"
            value={sendModal.email}
            placeholder="kund@example.com"
            onChange={(e) => setSendModal((s) => ({ ...s, email: e.target.value }))}
            style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', font: 'inherit' }}
          />
          <label style={{ fontSize: 13, color: 'var(--muted, #64748b)', marginTop: 10 }}>{t('Message (optional)')}</label>
          <textarea
            rows={5}
            value={sendModal.message}
            onChange={(e) => setSendModal((s) => ({ ...s, message: e.target.value }))}
            style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #cbd5e1', font: 'inherit', resize: 'vertical' }}
          />
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#94a3b8' }}>
            {t('The invoice is attached as a PDF. Subject and greeting are added automatically.')}
          </p>
        </div>
      </AdminModal>
    </>
  );
}
