import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { App, Button, Dropdown, message } from 'antd';
import { DeleteOutlined, MailOutlined, FolderAddOutlined, FolderOpenOutlined, DownOutlined, TeamOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useShiftStore } from '@/src/store/shiftStore';
import { useUserStore } from '@/src/store/userStore';
import { useAuthStore } from '@/src/store/authStore';
import { useModuleStore } from '@/src/store/moduleStore';
import { useCompaniesInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useLiveWorkData } from '@/src/shared/hooks/useLiveWorkData';
import UserCreateForm from '@/src/features/users/components/UserCreateForm';
import UserBulkImport from '@/src/features/users/components/UserBulkImport';
import UserListFilters from '@/src/features/users/components/UserListFilters';
import AdminModal from '@/src/shared/components/AdminModal';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import { useT } from '@/src/i18n/LanguageProvider';
import AdminTable from '@/src/shared/components/AdminTable';
import { getLiveStatusSortPriority } from '@/src/utils/liveStatus';
import StatusPills from '@/src/shared/components/StatusPills';
import useAddButton from '@/src/shared/hooks/useAddButton';
import useAutoOpenCreate from '@/src/shared/hooks/useAutoOpenCreate';
import { useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import { matchesEntityId } from '@/src/utils/entityId';
import { summarizeCertificates } from '@/src/features/users/certificates/certificateStatus';
import { USER_STATUS_GROUPS, getUserStatusGroup, LIVE_POLL_INTERVAL_MS } from '@/src/features/users/userListUtils';
import { buildUserColumns } from '@/src/features/users/userListColumns';

export default function UserListPage() {
  const { users, loading, fetchAll, fetchByCompany, remove } = useUserStore();
  const t = useT();
  const { fetchAllAccessible: fetchShifts } = useShiftStore();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(() => searchParams.get('projectId') || undefined);
  const [selectedCompanyId, setSelectedCompanyId] = useState(undefined);
  const [selectedCertStatus, setSelectedCertStatus] = useState(undefined);
  const [selectedLiveStatus, setSelectedLiveStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const { registerBulkButton, unregisterBulkButton } = useOutletContext();
  const [bulkOpen, setBulkOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { modal } = App.useApp();

  // Seat-limit usage (company plan). companyAdmin sees "X / N" and, at the cap,
  // an upgrade prompt. maxUsers null = unlimited (no banner).
  const maxUsers = useModuleStore((s) => s.maxUsers);
  const fetchModules = useModuleStore((s) => s.fetchForCompany);
  const isCompanyAdmin = user?.role === 'companyAdmin';

  const companyIds = useMemo(() => 
    users.map(u => u.companyId).filter(Boolean),
    [users]
  );
  const { companies } = useCompaniesInfo(companyIds);
  const { workerShiftMap } = useLiveWorkData(Boolean(user));

  const baseFilteredUsers = useMemo(() => users.filter((record) => {
    // Company admins work and track hours too, so they belong in the Employees
    // list. Only the platform superadmin (not a company employee) is hidden.
    if (record.role === 'superadmin') {
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

  const filteredUsers = useMemo(() => (
    selectedLiveStatus === 'all'
      ? baseFilteredUsers
      : baseFilteredUsers.filter((record) =>
        getUserStatusGroup(record, workerShiftMap[record._id]) === selectedLiveStatus)
  ), [baseFilteredUsers, selectedLiveStatus, workerShiftMap]);

  const statusFilterNode = useMemo(() => {
    const counts = baseFilteredUsers.reduce((acc, record) => {
      const group = getUserStatusGroup(record, workerShiftMap[record._id]);
      if (group) acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});
    const options = [
      { value: 'all', label: t('All'), count: baseFilteredUsers.length },
      ...USER_STATUS_GROUPS.map((group) => ({
        value: group.value,
        label: t(group.label),
        count: counts[group.value] || 0,
      })),
    ];
    return <StatusPills options={options} value={selectedLiveStatus} onChange={setSelectedLiveStatus} />;
  }, [baseFilteredUsers, selectedLiveStatus, workerShiftMap, t]);

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
    if (isCompanyAdmin && user?.companyId) fetchModules(user.companyId);
    registerBulkButton(() => setBulkOpen(true));
    return () => {
      unregisterBulkButton();
    };
  }, [fetchShifts, loadUsers, registerBulkButton, unregisterBulkButton, isCompanyAdmin, user?.companyId, fetchModules]);

  useAddButton(() => showModal(), 'Add user');
  useAutoOpenCreate(() => showModal());

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
    if (!ids.length) return { ok: 0, fail: 0, error: null };
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    let error = null;
    for (const id of ids) {
      try {
        await fn(id);
        ok += 1;
      } catch (err) {
        fail += 1;
        if (!error) error = err?.response?.data?.message || null;
      }
    }
    setBulkBusy(false);
    return { ok, fail, error };
  };

  const handleBulkDelete = async () => {
    const { ok, fail, error } = await runBulk((id) => remove(id));
    setSelectedUsers([]);
    if (ok) message.success(`${ok} ${t('deleted')}`);
    if (fail) message.error(error ? `${fail} ${t('could not be deleted')}: ${error}` : `${fail} ${t('could not be deleted')}`);
  };

  const handleBulkResend = async () => {
    const { ok, fail, error } = await runBulk((id) => apiClient.post(`/users/${id}/resend-invite`));
    if (ok) message.success(`${ok} ${t('invitations sent')}`);
    if (fail) message.error(error ? `${fail} ${t('failed')}: ${error}` : `${fail} ${t('failed')}`);
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

  const columns = buildUserColumns({
    t,
    navigate,
    workerShiftMap,
    companies,
    onEdit: showModal,
    onResendInvite: handleResendInvite,
    onDelete: handleDelete,
  });

  const canBulk = user?.role === 'superadmin' || user?.role === 'companyAdmin';

  const confirmBulkDelete = () => {
    modal.confirm({
      title: t('Delete selected users?'),
      okText: t('Delete'),
      okButtonProps: { danger: true },
      cancelText: t('Cancel'),
      onOk: handleBulkDelete,
    });
  };

  // Delete is surfaced as a direct button (like every other table); the rest of
  // the bulk actions stay in the Actions dropdown.
  const bulkActionItems = [
    { key: 'add', icon: <FolderAddOutlined />, label: t('Add to project') },
    { key: 'remove', icon: <FolderOpenOutlined />, label: t('Remove from project') },
    { key: 'resend', icon: <MailOutlined />, label: t('Resend invite') },
  ];

  const onBulkAction = ({ key }) => {
    if (key === 'add') openAssign('add');
    else if (key === 'remove') openAssign('remove');
    else if (key === 'resend') handleBulkResend();
  };

  const bulkBar = canBulk && selectedUsers.length ? (
    <>
      <Button danger icon={<DeleteOutlined />} loading={bulkBusy} onClick={confirmBulkDelete}>
        {t('Delete')} ({selectedUsers.length})
      </Button>
      <Dropdown
        menu={{ items: bulkActionItems, onClick: onBulkAction }}
        trigger={['click']}
        disabled={bulkBusy}
      >
        <Button loading={bulkBusy}>
          {t('Actions')} <DownOutlined />
        </Button>
      </Dropdown>
    </>
  ) : null;

  const seatCount = isCompanyAdmin ? users.length : 0;
  const seatFull = isCompanyAdmin && maxUsers != null && seatCount >= maxUsers;

  return (
    <>
      {isCompanyAdmin && maxUsers != null ? (
        <div className={`seat-usage${seatFull ? ' seat-usage--full' : ''}`}>
          <span className="seat-usage__count">
            {t('Team seats')}: <strong>{seatCount} / {maxUsers}</strong>
          </span>
          {seatFull ? (
            <span className="seat-usage__cta">
              {t('Seat limit reached — upgrade your plan to add more people.')}
              <button type="button" onClick={() => navigate('/company/billing')}>
                {t('Upgrade plan')} →
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      <AdminTable
        dataSource={filteredUsers}
        statusFilter={statusFilterNode}
        columns={columns}
        rowKey="_id"
        loading={loading}
        projectFilter={toolbarStart}
        toolbarEnd={bulkBar}
        rowSelection={{
          selectedRowKeys: selectedUsers.map((selectedUser) => selectedUser._id),
          onChange: (_selectedRowKeys, rows) => setSelectedUsers(rows),
        }}
        emptyState={{
          icon: <TeamOutlined />,
          title: t('No team members yet'),
          description: t('Add your crew so they can log shifts, hours and photos from the mobile app.'),
          actionLabel: t('Add your first team member'),
          onAction: () => showModal(),
        }}
      />

      <AdminModal
        title={editingUser ? t('Edit user') : t('Create user')}
        saveForm="user-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
        // Create is a step-by-step wizard that renders its own Back/Next footer;
        // hide the built-in Cancel/Save row for it. Edit keeps the single form.
        footer={editingUser ? undefined : null}
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
            placeholder={t('Select project')}
          />
        </div>
      </AdminModal>
    </>
  );
}
