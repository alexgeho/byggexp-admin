import { useEffect, useMemo, useState } from 'react';
import { Tag } from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import useAddButton from '@/src/shared/hooks/useAddButton';
import LeaveForm from '@/src/features/leave/components/LeaveForm';
import { useLeaveStore } from '@/src/store/leaveStore';
import { getEntityId } from '@/src/utils/entityId';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { LEAVE_STATUS_META, leaveStatusLabel, leaveTypeLabel } from '@/src/features/leave/leaveTypes';

export default function LeaveListPage() {
  const { requests, loading, fetchAll, review, remove } = useLeaveStore();
  const { t, lang } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const showModal = (record = null) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setEditing(null); setModalOpen(false); };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useAddButton(() => showModal(), 'Add leave request');

  const statusFilterOptions = useMemo(() => {
    const count = requests.reduce((a, r) => {
      const s = String(r?.status || 'pending');
      a[s] = (a[s] || 0) + 1;
      return a;
    }, {});
    return [
      { value: 'all', label: t('All'), count: requests.length },
      { value: 'pending', label: t('Pending'), count: count.pending || 0 },
      { value: 'approved', label: t('Approved'), count: count.approved || 0 },
      { value: 'rejected', label: t('Rejected'), count: count.rejected || 0 },
    ];
  }, [requests, t]);

  const filtered = useMemo(() => (
    statusFilter === 'all'
      ? requests
      : requests.filter((r) => String(r?.status || 'pending') === statusFilter)
  ), [requests, statusFilter]);

  const columns = useMemo(() => [
    { title: t('Worker'), dataIndex: 'userName', key: 'userName', render: (v) => v || '—' },
    { title: t('Type'), dataIndex: 'type', key: 'type', render: (v) => leaveTypeLabel(v, lang) },
    { title: t('From'), dataIndex: 'startDate', key: 'startDate', render: (v) => (v ? formatAdminDate(v) : '—') },
    { title: t('To'), dataIndex: 'endDate', key: 'endDate', render: (v) => (v ? formatAdminDate(v) : '—') },
    {
      title: t('Half day'),
      dataIndex: 'halfDay',
      key: 'halfDay',
      align: 'center',
      render: (v) => (v ? '½' : '—'),
    },
    { title: t('Reason'), dataIndex: 'reason', key: 'reason', render: (v) => v || '—' },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (v = 'pending') => (
        <Tag color={(LEAVE_STATUS_META[v] || LEAVE_STATUS_META.pending).color}>
          {leaveStatusLabel(v, lang).toUpperCase()}
        </Tag>
      ),
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            record.status !== 'approved' && {
              key: 'approve',
              label: t('Approve'),
              icon: <CheckCircleOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => review(getEntityId(record), 'approved'),
            },
            record.status !== 'rejected' && {
              key: 'reject',
              label: t('Reject'),
              icon: <CloseCircleOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => review(getEntityId(record), 'rejected'),
            },
            record.status === 'pending' && {
              key: 'edit',
              label: t('Edit'),
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => showModal(record),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              confirmTitle: t('Delete leave request?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [remove, review, t, lang]);

  return (
    <>
      <AdminTable
        dataSource={filtered}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 1000 }}
        showSearch={false}
        statusFilter={(
          <StatusPills options={statusFilterOptions} value={statusFilter} onChange={setStatusFilter} />
        )}
        emptyState={{
          icon: <CalendarOutlined />,
          title: t('No leave requests yet'),
          description: t('Track holiday, sick days and other absence, with approval.'),
          actionLabel: t('Add your first leave request'),
          onAction: () => showModal(),
        }}
      />

      <AdminModal
        title={editing ? t('Edit leave request') : t('New leave request')}
        saveForm="leave-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={720}
      >
        <LeaveForm onClose={closeModal} requestToEdit={editing} />
      </AdminModal>
    </>
  );
}
