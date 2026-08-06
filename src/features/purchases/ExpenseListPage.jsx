import { useEffect, useMemo, useState } from 'react';
import { Button, Tag } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  FileImageOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import ExpenseForm from '@/src/features/purchases/components/ExpenseForm';
import BulkScanModal from '@/src/features/purchases/components/BulkScanModal';
import { useAuthStore } from '@/src/store/authStore';
import { useExpenseStore } from '@/src/store/expenseStore';
import { getEntityId } from '@/src/utils/entityId';
import { resolveToolPhotoUrl } from '@/src/utils/toolPhotos';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';

// Unified badge palette (matches invoices / supplier invoices / payroll):
// default=neutral, processing=in-progress, success=done/paid, error=rejected.
const STATUS_COLORS = {
  submitted: 'processing',
  approved: 'processing',
  rejected: 'error',
  reimbursed: 'success',
};
const STATUS_SV = {
  submitted: 'Inskickad',
  approved: 'Godkänd',
  rejected: 'Avvisad',
  reimbursed: 'Utbetald',
};
const STATUS_EN = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  reimbursed: 'Reimbursed',
};
const statusLabel = (s, lang) => (lang === 'sv' ? STATUS_SV[s] || s : STATUS_EN[s] || s);

export default function ExpenseListPage() {
  const { expenses, loading, fetchAll, setStatus, remove } = useExpenseStore();
  const { t, lang } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectNames, setProjectNames] = useState({});
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const showModal = (record = null) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setEditing(null); setModalOpen(false); };
  const closeBulk = (didSave) => { setBulkOpen(false); if (didSave) fetchAll(); };

  useEffect(() => {
    fetchAll();
    registerAddButton(() => showModal(), 'Add expense');
    return () => unregisterAddButton();
  }, [fetchAll, registerAddButton, unregisterAddButton]);

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
    const count = expenses.reduce((a, e) => {
      const s = String(e?.status || 'submitted');
      a[s] = (a[s] || 0) + 1;
      return a;
    }, {});
    return [
      { value: 'all', label: t('All'), count: expenses.length },
      { value: 'submitted', label: t('Submitted'), count: count.submitted || 0 },
      { value: 'approved', label: t('Approved'), count: count.approved || 0 },
      { value: 'reimbursed', label: t('Reimbursed'), count: count.reimbursed || 0 },
      { value: 'rejected', label: t('Rejected'), count: count.rejected || 0 },
    ];
  }, [expenses, t]);

  const filtered = useMemo(() => (
    statusFilter === 'all'
      ? expenses
      : expenses.filter((e) => String(e?.status || 'submitted') === statusFilter)
  ), [expenses, statusFilter]);

  const columns = useMemo(() => [
    {
      title: t('Receipt'),
      dataIndex: 'receiptUrl',
      key: 'receiptUrl',
      width: 64,
      render: (v) => (v ? (
        <a href={resolveToolPhotoUrl(v)} target="_blank" rel="noreferrer">
          <img src={resolveToolPhotoUrl(v)} alt="kvitto" style={{ height: 36, width: 36, objectFit: 'cover', borderRadius: 6 }} />
        </a>
      ) : <FileImageOutlined style={{ color: '#cbd5e1', fontSize: 20 }} />),
    },
    { title: t('Supplier'), dataIndex: 'supplierName', key: 'supplierName', render: (v) => v || '-' },
    { title: t('Category'), dataIndex: 'category', key: 'category', render: (v) => v || '-' },
    {
      title: t('Project'),
      key: 'project',
      render: (_, r) => (r.projectId ? projectNames[String(r.projectId)] || '—' : '—'),
    },
    { title: t('Date'), dataIndex: 'date', key: 'date', render: (v) => (v ? formatAdminDate(v) : '—') },
    {
      title: t('Paid by'),
      dataIndex: 'paidBy',
      key: 'paidBy',
      render: (v) => (v === 'company' ? t('Company card') : t('Own money')),
    },
    {
      title: t('Total'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v) => `${formatAmount(v)} SEK`,
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (v = 'submitted') => (
        <Tag color={STATUS_COLORS[v] || 'default'}>{statusLabel(v, lang).toUpperCase()}</Tag>
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
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => showModal(record),
            },
            ['submitted', 'rejected'].includes(record.status) && {
              key: 'approve',
              label: t('Approve'),
              icon: <CheckCircleOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setStatus(getEntityId(record), 'approved'),
            },
            record.status === 'submitted' && {
              key: 'reject',
              label: t('Reject'),
              icon: <CloseCircleOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setStatus(getEntityId(record), 'rejected'),
            },
            record.status === 'approved' && record.paidBy === 'own' && {
              key: 'reimbursed',
              label: t('Mark as reimbursed'),
              icon: <DollarOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setStatus(getEntityId(record), 'reimbursed'),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              confirmTitle: t('Delete expense?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [projectNames, remove, setStatus, t, lang]);

  return (
    <>
      <AdminTable
        dataSource={filtered}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 1120 }}
        toolbarStart={(
          <StatusPills options={statusFilterOptions} value={statusFilter} onChange={setStatusFilter} />
        )}
        toolbarEnd={(
          <Button icon={<ScanOutlined />} onClick={() => setBulkOpen(true)}>
            {t('Scan multiple')}
          </Button>
        )}
      />

      <AdminModal
        title={editing ? t('Edit expense') : t('New expense')}
        saveForm="expense-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={880}
      >
        <ExpenseForm onClose={closeModal} expenseToEdit={editing} />
      </AdminModal>

      <BulkScanModal open={bulkOpen} onClose={closeBulk} />
    </>
  );
}
