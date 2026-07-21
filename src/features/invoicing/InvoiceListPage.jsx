import { useEffect, useMemo, useState } from 'react';
import { Tag, message } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import { useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import apiClient from '@/src/api/apiClient';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';
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

const formatAmount = (value) => new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

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
      const status = String(invoice?.status || 'draft').toLowerCase();
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    return [
      { value: 'all', label: 'All', count: invoices.length },
      { value: 'draft', label: 'Drafts', count: countByStatus.draft || 0 },
      { value: 'sent', label: 'Sent', count: countByStatus.sent || 0 },
      { value: 'paid', label: 'Paid', count: countByStatus.paid || 0 },
    ];
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') {
      return invoices;
    }

    return invoices.filter(
      (invoice) => String(invoice?.status || 'draft').toLowerCase() === statusFilter,
    );
  }, [invoices, statusFilter]);

  const downloadPdf = async (invoice) => {
    const id = getEntityId(invoice);
    try {
      const res = await apiClient.get(`/invoices/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoiceNumber || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      message.error(formatApiError(err, 'Failed to download invoice PDF'));
    }
  };

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
      render: (value = 'draft') => (
        <Tag color={STATUS_COLORS[value] || 'default'}>
          {String(value).toUpperCase()}
        </Tag>
      ),
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
