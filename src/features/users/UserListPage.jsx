import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Avatar, Button, Popconfirm, Space, Tag, message } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, MailOutlined, FolderAddOutlined, FolderOpenOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useShiftStore } from '@/src/store/shiftStore';
import { useUserStore } from '@/src/store/userStore';
import { useAuthStore } from '@/src/store/authStore';
import { useCompaniesInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useLiveWorkData } from '@/src/shared/hooks/useLiveWorkData';
import UserCreateForm from '@/src/features/users/components/UserCreateForm';
import UserBulkImport from '@/src/features/users/components/UserBulkImport';
import UserShiftCalendarPanel from '@/src/features/users/components/UserShiftCalendarPanel';
import UserListFilters from '@/src/features/users/components/UserListFilters';
import AdminModal from '@/src/shared/components/AdminModal';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import { useT } from '@/src/i18n/LanguageProvider';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import LiveStatusCell from '@/src/shared/components/LiveStatusCell';
import { getLiveStatusSortPriority } from '@/src/utils/liveStatus';
import { useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import { matchesEntityId } from '@/src/utils/entityId';
import { summarizeCertificates, getCertificateStatusMeta } from '@/src/features/users/certificates/certificateStatus';

const LIVE_POLL_INTERVAL_MS = 15000;

const resolveUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, apiClient.defaults.baseURL).toString();
  } catch {
    return url;
  }
};

export default function UserListPage() {
  const { users, loading, fetchAll, fetchByCompany, remove } = useUserStore();
  const t = useT();
  const { shifts, loading: shiftsLoading, fetchAllAccessible: fetchShifts } = useShiftStore();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(() => searchParams.get('projectId') || undefined);
  const [selectedCompanyId, setSelectedCompanyId] = useState(undefined);
  const [selectedCertStatus, setSelectedCertStatus] = useState(undefined);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const { registerAddButton, unregisterAddButton, registerBulkButton, unregisterBulkButton } = useOutletContext();
  const [bulkOpen, setBulkOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const companyIds = useMemo(() => 
    users.map(u => u.companyId).filter(Boolean),
    [users]
  );
  const { companies } = useCompaniesInfo(companyIds);
  const { workerShiftMap } = useLiveWorkData(Boolean(user));

  const filteredUsers = useMemo(() => users.filter((record) => {
    // The company/owner account (companyAdmin) and platform superadmin are not
    // employees, so keep them out of the Employees list.
    if (record.role === 'companyAdmin' || record.role === 'superadmin') {
      return false;
    }

    if (selectedCompanyId && String(record.companyId) !== String(selectedCompanyId)) {
      return false;
    }

    if (selectedProjectId) {
      const projectIds = Array.isArray(record.projectIds) ? record.projectIds : [];
      const isAssignedToProject = projectIds.some((projectId) =>
        matchesEntityId({ _id: projectId }, selectedProjectId),
      );

      if (!isAssignedToProject) {
        return false;
      }
    }

    if (selectedCertStatus) {
      const summary = summarizeCertificates(record.certificates || []);
      const matches = {
        attention: summary.counts.expired > 0 || summary.counts.expiring > 0,
        expired: summary.counts.expired > 0,
        expiring: summary.counts.expiring > 0,
        valid: summary.total > 0 && summary.counts.expired === 0 && summary.counts.expiring === 0,
        none: summary.total === 0,
      }[selectedCertStatus];

      if (!matches) {
        return false;
      }
    }

    return true;
  }).sort((a, b) =>
    getLiveStatusSortPriority(a, workerShiftMap[a._id]) -
    getLiveStatusSortPriority(b, workerShiftMap[b._id]),
  ), [users, selectedCompanyId, selectedProjectId, selectedCertStatus, workerShiftMap]);

  useEffect(() => {
    setSelectedUsers((previous) => previous.filter((selectedUser) =>
      filteredUsers.some((record) => matchesEntityId(record, selectedUser._id)),
    ));
  }, [filteredUsers]);

  const toolbarStart = useMemo(() => (
    <UserListFilters
      selectedProjectId={selectedProjectId}
      selectedCompanyId={selectedCompanyId}
      selectedCertStatus={selectedCertStatus}
      onProjectChange={setSelectedProjectId}
      onCompanyChange={setSelectedCompanyId}
      onCertStatusChange={setSelectedCertStatus}
    />
  ), [selectedCompanyId, selectedProjectId, selectedCertStatus]);

  const loadUsers = useCallback(async (silent = false) => {
    try {
      if (user?.role === 'superadmin') {
        await fetchAll({ silent });
      } else if (user?.role === 'companyAdmin' && user?.companyId) {
        await fetchByCompany(user.companyId, { silent });
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, [user, fetchAll, fetchByCompany]);

  const showModal = (userToEdit = null) => {
    setEditingUser(userToEdit);
    setModalOpen(true);
  };
  const closeModal = () => {
    setEditingUser(null);
    setModalOpen(false);
  };

  useEffect(() => {
    loadUsers();
    fetchShifts().catch((error) => {
      console.error('Failed to fetch shifts:', error);
    });
    registerAddButton(() => showModal(), 'Add user');
    registerBulkButton(() => setBulkOpen(true));
    return () => {
      unregisterAddButton();
      unregisterBulkButton();
    };
  }, [fetchShifts, loadUsers, registerAddButton, unregisterAddButton, registerBulkButton, unregisterBulkButton]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const pollId = setInterval(() => {
      loadUsers(true);
    }, LIVE_POLL_INTERVAL_MS);

    return () => clearInterval(pollId);
  }, [user, loadUsers]);

  const handleDelete = async (id) => {
    try {
      await remove(id);
      message.success('User deleted');
    } catch {
      message.error('Failed to delete user');
    }
  };

  const handleResendInvite = async (id) => {
    try {
      await apiClient.post(`/users/${id}/resend-invite`);
      message.success(t('Invitation sent'));
    } catch (error) {
      message.error(error?.response?.data?.message || t('Failed to send invitation'));
    }
  };

  const [bulkBusy, setBulkBusy] = useState(false);

  const runBulk = async (fn) => {
    const ids = selectedUsers.map((selected) => selected._id);
    if (!ids.length) return { ok: 0, fail: 0 };
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try { await fn(id); ok += 1; } catch { fail += 1; }
    }
    setBulkBusy(false);
    return { ok, fail };
  };

  const handleBulkDelete = async () => {
    const { ok, fail } = await runBulk((id) => remove(id));
    setSelectedUsers([]);
    if (ok) message.success(`${ok} ${t('deleted')}`);
    if (fail) message.error(`${fail} ${t('could not be deleted')}`);
  };

  const handleBulkResend = async () => {
    const { ok, fail } = await runBulk((id) => apiClient.post(`/users/${id}/resend-invite`));
    if (ok) message.success(`${ok} ${t('invitations sent')}`);
    if (fail) message.error(`${fail} ${t('failed')}`);
  };

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState('add'); // 'add' | 'remove'
  const [assignProjectId, setAssignProjectId] = useState(undefined);

  const openAssign = (mode) => {
    setAssignMode(mode);
    setAssignProjectId(undefined);
    setAssignOpen(true);
  };

  const handleBulkAssign = async () => {
    if (!assignProjectId) return;
    const target = String(assignProjectId);
    const { ok, fail } = await runBulk(async (id) => {
      const record = selectedUsers.find((u) => u._id === id);
      const current = (record?.projectIds || []).map(String);
      const nextIds = assignMode === 'remove'
        ? current.filter((pid) => pid !== target)
        : Array.from(new Set([...current, target]));
      await apiClient.put(`/users/${id}`, { projectIds: nextIds });
    });
    setAssignOpen(false);
    setAssignProjectId(undefined);
    setSelectedUsers([]);
    await loadUsers(true);
    if (ok) message.success(`${ok} ${assignMode === 'remove' ? t('removed from project') : t('added to project')}`);
    if (fail) message.error(`${fail} ${t('failed')}`);
  };

  const columns = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => {
        const avatarUrl = resolveUrl(record.avatarUrl);
        const displayName = text || record.email || 'User';

        return (
          <span className="admin-table-user">
            <Avatar size={39} src={avatarUrl} className="admin-table-user__avatar">
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <a className="admin-table-user__name" onClick={() => navigate(record._id)}>
              {displayName}
            </a>
          </span>
        );
      },
    },
    {
      title: t('At work'),
      key: 'live',
      width: 220,
      ellipsis: false,
      render: (_, record) => (
        <LiveStatusCell
          user={record}
          workerShiftInfo={workerShiftMap[record._id]}
        />
      ),
    },
    {
      title: t('Email'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('Role'),
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: t('Phone'),
      key: 'phone',
      render: (_, user) => {
        if (!user.phoneAreaCode || !user.phoneNumber) return '-';
        return `+${user.phoneAreaCode} ${user.phoneNumber}`;
      },
    },
    {
      title: t('Company'),
      key: 'company',
      render: (_, record) => {
        const company = companies[record.companyId];
        return company?.name || '-';
      },
    },
    {
      title: t('Certificates'),
      key: 'certificates',
      render: (_, record) => {
        const summary = summarizeCertificates(record.certificates || []);
        if (!summary.total) {
          return <span style={{ color: 'var(--admin-text-muted, #999)' }}>—</span>;
        }
        if (summary.counts.expired || summary.counts.expiring) {
          const worst = summary.counts.expired ? 'expired' : 'expiring';
          const meta = getCertificateStatusMeta(worst);
          const count = summary.counts.expired || summary.counts.expiring;
          return (
            <Tag color={meta.color}>
              {count} {summary.counts.expired ? t('expired') : t('expiring soon')}
            </Tag>
          );
        }
        return <Tag color="green">{summary.total} {t('valid')}</Tag>;
      },
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'view',
              label: t('View'),
              icon: <EyeOutlined />,
              onClick: () => navigate(record._id),
            },
            {
              key: 'edit',
              label: t('Edit'),
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => showModal(record),
            },
            {
              key: 'resend-invite',
              label: t('Resend invite'),
              icon: <MailOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => handleResendInvite(record._id),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: t('Delete user?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => handleDelete(record._id),
            },
          ]}
        />
      ),
    },
  ];

  const canBulk = user?.role === 'superadmin' || user?.role === 'companyAdmin';
  const bulkBar = canBulk && selectedUsers.length ? (
    <Space>
      <span className="user-list-page__bulk-count">{selectedUsers.length} {t('selected')}</span>
      <Button icon={<FolderAddOutlined />} onClick={() => openAssign('add')}>
        {t('Add to project')}
      </Button>
      <Button icon={<FolderOpenOutlined />} onClick={() => openAssign('remove')}>
        {t('Remove from project')}
      </Button>
      <Button icon={<MailOutlined />} loading={bulkBusy} onClick={handleBulkResend}>
        {t('Resend invite')}
      </Button>
      <Popconfirm
        title={t('Delete selected users?')}
        okText={t('Delete')}
        okButtonProps={{ danger: true }}
        cancelText={t('Cancel')}
        onConfirm={handleBulkDelete}
      >
        <Button danger icon={<DeleteOutlined />} loading={bulkBusy}>{t('Delete')}</Button>
      </Popconfirm>
    </Space>
  ) : null;

  return (
    <>
      <div className="user-list-page">
        <div className="user-list-page__table">
          <AdminTable
            dataSource={filteredUsers}
            columns={columns}
            rowKey="_id"
            loading={loading}
            toolbarStart={toolbarStart}
            toolbarEnd={bulkBar}
            rowSelection={{
              selectedRowKeys: selectedUsers.map((selectedUser) => selectedUser._id),
              onChange: (_selectedRowKeys, rows) => setSelectedUsers(rows),
            }}
          />
        </div>

        <UserShiftCalendarPanel
          selectedUsers={selectedUsers}
          shifts={shifts}
          loading={shiftsLoading}
        />
      </div>

      <AdminModal
        title={editingUser ? t('Edit user') : t('Create user')}
        saveForm="user-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
      >
        <UserCreateForm onClose={closeModal} userToEdit={editingUser} />
      </AdminModal>

      <UserBulkImport
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onDone={() => loadUsers(true)}
      />

      <AdminModal
        title={assignMode === 'remove' ? t('Remove from project') : t('Add to project')}
        open={assignOpen}
        onCancel={() => { setAssignOpen(false); setAssignProjectId(undefined); }}
        onSave={handleBulkAssign}
        saveText={assignMode === 'remove' ? t('Remove') : t('Add')}
        saveDisabled={!assignProjectId}
        saveLoading={bulkBusy}
        width={460}
        destroyOnHidden
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--admin-text-muted, #64748b)' }}>
            {selectedUsers.length} {t('selected')}
          </span>
          <ProjectFilterSelect
            value={assignProjectId}
            onChange={setAssignProjectId}
            placeholder="Välj projekt"
          />
        </div>
      </AdminModal>
    </>
  );
}
