import { useEffect, useState, useMemo, useCallback } from 'react';
import { Avatar, message } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useUserStore } from '@/src/store/userStore';
import { useAuthStore } from '@/src/store/authStore';
import { useCompaniesInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useLiveWorkData } from '@/src/shared/hooks/useLiveWorkData';
import UserCreateForm from '@/src/features/users/components/UserCreateForm';
import UserListFilters from '@/src/features/users/components/UserListFilters';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import LiveStatusCell from '@/src/shared/components/LiveStatusCell';
import { useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import { matchesEntityId } from '@/src/utils/entityId';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(undefined);
  const [selectedCompanyId, setSelectedCompanyId] = useState(undefined);
  const { registerAddButton, unregisterAddButton } = useOutletContext();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const companyIds = useMemo(() => 
    users.map(u => u.companyId).filter(Boolean),
    [users]
  );
  const { companies } = useCompaniesInfo(companyIds);
  const { workerShiftMap } = useLiveWorkData(Boolean(user));

  const filteredUsers = useMemo(() => users.filter((record) => {
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

    return true;
  }), [users, selectedCompanyId, selectedProjectId]);

  const toolbarStart = useMemo(() => (
    <UserListFilters
      selectedProjectId={selectedProjectId}
      selectedCompanyId={selectedCompanyId}
      onProjectChange={setSelectedProjectId}
      onCompanyChange={setSelectedCompanyId}
    />
  ), [selectedCompanyId, selectedProjectId]);

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
    registerAddButton(() => showModal(), 'Add user');
    return () => unregisterAddButton();
  }, [loadUsers, registerAddButton, unregisterAddButton]);

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

  const columns = [
    {
      title: 'Name',
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
      title: 'Live',
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
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: 'Phone',
      key: 'phone',
      render: (_, user) => {
        if (!user.phoneAreaCode || !user.phoneNumber) return '-';
        return `+${user.phoneAreaCode} ${user.phoneNumber}`;
      },
    },
    {
      title: 'Company',
      key: 'company',
      render: (_, record) => {
        const company = companies[record.companyId];
        return company?.name || '-';
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
              label: 'View',
              icon: <EyeOutlined />,
              onClick: () => navigate(record._id),
            },
            {
              key: 'edit',
              label: 'Edit',
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => showModal(record),
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin'],
              confirmTitle: 'Delete user?',
              confirmOkText: 'Delete',
              confirmCancelText: 'Cancel',
              onClick: () => handleDelete(record._id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <AdminTable
        dataSource={filteredUsers}
        columns={columns}
        rowKey="_id"
        loading={loading}
        toolbarStart={toolbarStart}
      />

      <AdminModal
        title={editingUser ? 'Edit user' : 'Create user'}
        saveForm="user-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
      >
        <UserCreateForm onClose={closeModal} userToEdit={editingUser} />
      </AdminModal>
    </>
  );
}
