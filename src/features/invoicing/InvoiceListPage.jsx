import { useEffect, useMemo, useState } from 'react';
import { Button, Popconfirm, Space, Tag, message } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import AdminDrawer from '@/src/shared/components/AdminDrawer';
import AdminTable from '@/src/shared/components/AdminTable';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import apiClient from '@/src/api/apiClient';
import InvoiceForm from '@/src/features/invoicing/components/InvoiceForm';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const STATUS_COLORS = {
  draft: 'default',
  sent: 'processing',
  paid: 'success',
  overdue: 'error',
  cancelled: 'warning',
};

const formatAmount = (value) => new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat('sv-SE').format(new Date(parsed));
};

export default function InvoiceListPage() {
  const { invoices, loading, fetchAllAccessible, remove, copy } = useInvoiceStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const showDrawer = (invoiceToEdit = null) => {
    setEditingInvoice(invoiceToEdit);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setEditingInvoice(null);
    setDrawerOpen(false);
  };

  useEffect(() => {
    fetchAllAccessible();
    registerAddButton(() => showDrawer(), 'Add invoice');

    return () => unregisterAddButton();
  }, [fetchAllAccessible, registerAddButton, unregisterAddButton]);

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
      render: formatDate,
    },
    {
      title: 'Due',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: formatDate,
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
      title: 'Actions',
      key: 'actions',
      width: 190,
      ellipsis: false,
      render: (_, record) => (
        <Space size="small">
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => showDrawer(record)}
            />
          </RoleBasedAccess>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => downloadPdf(record)}
          />
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Button
              type="link"
              icon={<CopyOutlined />}
              onClick={() => copy(getEntityId(record))}
            />
          </RoleBasedAccess>
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Popconfirm
              title="Delete invoice?"
              onConfirm={() => remove(getEntityId(record))}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </RoleBasedAccess>
        </Space>
      ),
    },
  ], [copy, remove]);

  return (
    <>
      <AdminTable
        dataSource={invoices}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 1240 }}
      />

      <AdminDrawer
        title={editingInvoice ? 'Edit invoice' : 'Create invoice'}
        saveText={editingInvoice ? 'Save invoice' : 'Create invoice'}
        saveForm="invoice-form"
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
        width={960}
      >
        <InvoiceForm onClose={closeDrawer} invoiceToEdit={editingInvoice} />
      </AdminDrawer>
    </>
  );
}
