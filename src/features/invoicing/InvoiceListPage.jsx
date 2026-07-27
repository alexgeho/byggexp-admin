import { useEffect, useMemo, useState } from 'react';
import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import { useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import { downloadInvoicePdf } from '@/src/features/invoicing/invoicePdf';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const STATUS_COLORS = {
  draft: 'default',
  sent: 'processing',
  paid: 'success',
  overdue: 'error',
  cancelled: 'warning',
};

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
  const { invoices, loading, fetchAllAccessible, remove, copy, updateStatus } = useInvoiceStore();
  const navigate = useNavigate();
  const { registerAddButton, unregisterAddButton } = useOutletContext();
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAllAccessible();
    registerAddButton(() => navigate('new'), 'Add invoice');

    return () => unregisterAddButton();
  }, [fetchAllAccessible, navigate, registerAddButton, unregisterAddButton]);

  const statusFilterOptions = useMemo(() => {
    const countByStatus = invoices.reduce((accumulator, invoice) => {
      const status = effectiveStatus(invoice);
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    return [
      { value: 'all', label: 'All', count: invoices.length },
      { value: 'draft', label: 'Drafts', count: countByStatus.draft || 0 },
      { value: 'sent', label: 'Sent', count: countByStatus.sent || 0 },
      { value: 'overdue', label: 'Overdue', count: countByStatus.overdue || 0 },
      { value: 'paid', label: 'Paid', count: countByStatus.paid || 0 },
    ];
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') {
      return invoices;
    }

    return invoices.filter((invoice) => effectiveStatus(invoice) === statusFilter);
  }, [invoices, statusFilter]);

  const downloadPdf = (invoice) => downloadInvoicePdf(invoice);

  const columns = useMemo(() => [
    {
      title: 'No.',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 90,
      sorter: (a, b) => Number(a.invoiceNumber || 0) - Number(b.invoiceNumber || 0),
    },
    {
      title: 'Customer',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (value) => value || '-',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: formatAdminDate,
    },
    {
      title: 'Due',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: formatAdminDate,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_value, record) => {
        const status = effectiveStatus(record);
        return (
          <Tag color={STATUS_COLORS[status] || 'default'}>
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'OCR',
      dataIndex: 'ocr',
      key: 'ocr',
      render: (value) => value || '-',
    },
    {
      title: 'Total',
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
            {
              key: 'edit',
              label: 'Edit',
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => navigate(`${getEntityId(record)}/edit`),
            },
            {
              key: 'download',
              label: 'Download',
              icon: <DownloadOutlined />,
              onClick: () => downloadPdf(record),
            },
            {
              key: 'copy',
              label: 'Copy',
              icon: <CopyOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => copy(getEntityId(record)),
            },
            !['paid', 'cancelled'].includes(effectiveStatus(record)) && {
              key: 'mark-paid',
              label: 'Mark as paid',
              icon: <CheckCircleOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => updateStatus(getEntityId(record), 'paid'),
            },
            {
              key: 'change-status',
              label: 'Change status',
              roles: ['superadmin', 'companyAdmin'],
              children: STATUS_OPTIONS.map((statusOption) => ({
                key: `status-${statusOption.value}`,
                label: statusOption.label,
                disabled: String(record?.status || 'draft') === statusOption.value,
                onClick: () => updateStatus(getEntityId(record), statusOption.value),
              })),
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: 'Delete invoice?',
              confirmOkText: 'Delete',
              confirmCancelText: 'Cancel',
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [copy, navigate, remove, updateStatus]);

  return (
    <AdminTable
      dataSource={filteredInvoices}
      columns={columns}
      rowKey="_id"
      loading={loading}
      scroll={{ x: 1240 }}
      toolbarStart={(
        <StatusPills
          options={statusFilterOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      )}
    />
  );
}
