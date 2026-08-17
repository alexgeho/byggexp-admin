import { useEffect, useMemo, useState } from 'react';
import { Tag } from 'antd';
import BulkScanInvoiceModal from '@/src/features/purchases/components/BulkScanInvoiceModal';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import StatusTag from '@/src/shared/components/StatusTag';
import useAddButton from '@/src/shared/hooks/useAddButton';
import useBulkButton from '@/src/shared/hooks/useBulkButton';
import SupplierInvoiceForm from '@/src/features/purchases/components/SupplierInvoiceForm';
import { useAuthStore } from '@/src/store/authStore';
import { useSupplierInvoiceStore } from '@/src/store/supplierInvoiceStore';
import { getEntityId } from '@/src/utils/entityId';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { paymentDueTone } from '@/src/features/purchases/paymentDue';

export default function SupplierInvoiceListPage() {
  const { invoices, loading, fetchAll, updateStatus, remove } = useSupplierInvoiceStore();
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectNames, setProjectNames] = useState({});
  // Captured once so overdue highlighting is stable across re-renders.
  const [now] = useState(() => Date.now());
  const closeBulk = (didSave) => { setBulkOpen(false); if (didSave) fetchAll(); };

  const showModal = (record = null) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setEditing(null); setModalOpen(false); };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useAddButton(() => showModal(), 'Add purchase invoice');
  useBulkButton(() => setBulkOpen(true), 'Scan multiple');

  useEffect(() => {
    const load = async () => {
      const url = user?.role === 'superadmin' ? '/projects' : '/projects/my';
      try {
        const { data } = await apiClient.get(url);
        setProjectNames(Object.fromEntries((data || []).map((p) => [getEntityId(p), p.name])));
      } catch { /* ignore */ }
    };
    load();
  }, [user?.role]);

  const statusFilterOptions = useMemo(() => {
    const count = invoices.reduce((a, inv) => {
      const s = String(inv?.status || 'registered');
      a[s] = (a[s] || 0) + 1;
      return a;
    }, {});
    return [
      { value: 'all', label: t('All'), count: invoices.length },
      { value: 'registered', label: t('Registered'), count: count.registered || 0 },
      { value: 'approved', label: t('Approved'), count: count.approved || 0 },
      { value: 'paid', label: t('Paid'), count: count.paid || 0 },
    ];
  }, [invoices, t]);

  const filtered = useMemo(() => (
    statusFilter === 'all'
      ? invoices
      : invoices.filter((inv) => String(inv?.status || 'registered') === statusFilter)
  ), [invoices, statusFilter]);

  const columns = useMemo(() => [
    {
      title: t('Supplier'),
      dataIndex: 'supplierName',
      key: 'supplierName',
      render: (v, r) => (
        <span className="supplier-name-cell">
          {v || '-'}
          {r.source === 'email' ? <Tag color="blue">{t('From email')}</Tag> : null}
        </span>
      ),
    },
    { title: t('Invoice no.'), dataIndex: 'invoiceNumber', key: 'invoiceNumber', render: (v) => v || '-' },
    {
      title: t('Project'),
      key: 'project',
      render: (_, r) => (r.projectId ? projectNames[String(r.projectId)] || '—' : '—'),
    },
    { title: t('Date'), dataIndex: 'invoiceDate', key: 'invoiceDate', render: formatAdminDate },
    {
      title: t('Due'),
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (v, r) => {
        const tone = paymentDueTone(r, now);
        return (
          <span className={tone && tone !== 'ok' ? `supplier-due supplier-due--${tone}` : undefined}>
            {formatAdminDate(v)}
          </span>
        );
      },
    },
    { title: t('Category'), dataIndex: 'category', key: 'category', render: (v) => v || '-' },
    {
      title: t('Total'),
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (v) => `${formatAmount(v)} SEK`,
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (v = 'registered') => (
        <StatusTag status={v} upper />
      ),
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'edit',
              label: t('Edit'),
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => showModal(record),
            },
            record.status === 'registered' && {
              key: 'approve',
              label: t('Approve'),
              icon: <CheckCircleOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => updateStatus(getEntityId(record), 'approved'),
            },
            record.status !== 'paid' && {
              key: 'paid',
              label: t('Mark as paid'),
              icon: <DollarOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => updateStatus(getEntityId(record), 'paid'),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: t('Delete purchase invoice?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [projectNames, remove, updateStatus, t, now]);

  return (
    <>
      <AdminTable
        dataSource={filtered}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 1120 }}
        statusFilter={(
          <StatusPills options={statusFilterOptions} value={statusFilter} onChange={setStatusFilter} />
        )}
        emptyState={{
          icon: <FileTextOutlined />,
          title: t('No purchase invoices yet'),
          description: t('Log supplier bills against projects to track real costs and stay ahead of due dates.'),
          actionLabel: t('Add your first purchase invoice'),
          onAction: () => showModal(),
        }}
      />

      <AdminModal
        title={editing ? t('Edit purchase invoice') : t('New purchase invoice')}
        saveForm="supplier-invoice-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={880}
      >
        <SupplierInvoiceForm onClose={closeModal} invoiceToEdit={editing} />
      </AdminModal>

      <BulkScanInvoiceModal open={bulkOpen} onClose={closeBulk} />
    </>
  );
}
