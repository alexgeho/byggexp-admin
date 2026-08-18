import { useEffect, useMemo, useState } from 'react';
import { Button, Space, Table } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  FileImageOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusTag from '@/src/shared/components/StatusTag';
import ExpenseForm from '@/src/features/purchases/components/ExpenseForm';
import { useExpenseStore } from '@/src/store/expenseStore';
import { getEntityId } from '@/src/utils/entityId';
import { resolveToolPhotoUrl } from '@/src/utils/toolPhotos';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const projectIdOf = (e) => (typeof e?.projectId === 'object' ? e?.projectId?._id : e?.projectId);

// Utlägg / kvitton scoped to one project. Reuses the global expense store and
// form; only the rows whose projectId matches this project are shown, and new
// expenses are pinned to it via ExpenseForm's lockedProjectId.
export default function ProjectExpensesTab({ projectId }) {
  const { t } = useLanguage();
  const { expenses, loading, fetchAll, setStatus, remove } = useExpenseStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  // Keep the table in its loading state until the first fetch resolves, so it
  // never flashes an empty "No data" frame while expenses are still loading.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchAll().finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [fetchAll]);

  const showModal = (record = null) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setEditing(null); setModalOpen(false); };

  const rows = useMemo(
    () => expenses.filter((e) => projectId && String(projectIdOf(e)) === String(projectId)),
    [expenses, projectId],
  );

  const totals = useMemo(() => {
    const approved = rows
      .filter((e) => ['approved', 'reimbursed'].includes(e.status))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const pending = rows
      .filter((e) => String(e.status || 'submitted') === 'submitted')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { approved, pending };
  }, [rows]);

  const columns = [
    {
      title: t('Receipt'),
      dataIndex: 'receiptUrl',
      key: 'receiptUrl',
      width: 56,
      render: (v) => (v ? (
        <a href={resolveToolPhotoUrl(v)} target="_blank" rel="noreferrer">
          <img src={resolveToolPhotoUrl(v)} alt="kvitto" style={{ height: 34, width: 34, objectFit: 'cover', borderRadius: 6 }} />
        </a>
      ) : <FileImageOutlined style={{ color: '#cbd5e1', fontSize: 18 }} />),
    },
    { title: t('Supplier'), dataIndex: 'supplierName', key: 'supplierName', render: (v) => v || '—' },
    { title: t('Category'), dataIndex: 'category', key: 'category', render: (v) => v || '—' },
    { title: t('Date'), dataIndex: 'date', key: 'date', render: (v) => (v ? formatAdminDate(v) : '—') },
    {
      title: t('Paid by'),
      dataIndex: 'paidBy',
      key: 'paidBy',
      render: (v) => (v === 'company' ? t('Company card') : t('Own money')),
    },
    {
      title: `${t('Total')} (SEK)`,
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v) => formatAmount(v),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (v = 'submitted') => <StatusTag status={v} upper />,
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
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Space size="large" wrap>
          <span>
            {t('Approved')}:{' '}
            <strong>{formatAmount(totals.approved)} SEK</strong>
          </span>
          <span style={{ color: 'var(--muted, #64748b)' }}>
            {t('Submitted')}: {formatAmount(totals.pending)} SEK
          </span>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          {t('Add expense')}
        </Button>
      </Space>

      <Table
        dataSource={rows}
        columns={columns}
        rowKey={(r) => getEntityId(r)}
        loading={loading || !ready}
        pagination={false}
        size="small"
        scroll={{ x: 900 }}
      />

      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted, #64748b)' }}>
        {t('Approved expenses feed the project cost breakdown under Finance.')}
      </p>

      <AdminModal
        title={editing ? t('Edit expense') : t('New expense')}
        saveForm="expense-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={880}
      >
        <ExpenseForm onClose={closeModal} expenseToEdit={editing} lockedProjectId={projectId} />
      </AdminModal>
    </div>
  );
}
