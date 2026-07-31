import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Avatar, Tag, message } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, MailOutlined } from '@ant-design/icons';
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
    </>
  );
}
