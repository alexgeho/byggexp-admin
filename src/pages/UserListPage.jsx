import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button, Tag, Popconfirm, message, Space } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { useCompaniesInfo } from '../hooks/useEntitiesInfo';
import { useLiveWorkData } from '../hooks/useLiveWorkData';
import UserCreateForm from '../components/UserCreateForm';
import AdminDrawer from '../components/AdminDrawer';
import AdminTable from '../components/AdminTable';
import LiveStatusCell from '../components/LiveStatusCell';
import { useNavigate, useOutletContext } from 'react-router-dom';
import RoleBasedAccess from '../components/RoleBasedAccess';

const LIVE_POLL_INTERVAL_MS = 15000;

export default function UserListPage() {
  const { users, loading, fetchAll, fetchByCompany, remove, update } = useUserStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { registerAddButton, unregisterAddButton } = useOutletContext();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const companyIds = useMemo(() => 
    users.map(u => u.companyId).filter(Boolean),
    [users]
  );
  const { companies } = useCompaniesInfo(companyIds);
  const { workerShiftMap } = useLiveWorkData(Boolean(user));

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

  const showDrawer = (userToEdit = null) => {
    setEditingUser(userToEdit);
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setEditingUser(null);
    setDrawerOpen(false);
  };

  useEffect(() => {
    loadUsers();
    registerAddButton(() => showDrawer(), 'Add user');
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

  const getRoleColor = (role) => {
    const colorMap = {
      superadmin: 'red',
      companyAdmin: 'orange',
      projectAdmin: 'blue',
      worker: 'green',
      client: 'default',
      admin: 'purple',
      manager: 'cyan',
    };
    return colorMap[role] || 'default';
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => navigate(record._id)}>{text}</a>
      ),
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
      render: (role) => (
        <Tag className="pill-tag" color={getRoleColor(role)}>{role}</Tag>
      ),
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
      title: 'Actions',
      key: 'actions',
      width: 160,
      ellipsis: false,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(record._id)}
          />
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => showDrawer(record)}
            />
          </RoleBasedAccess>
          <RoleBasedAccess allowedRoles={['superadmin']}>
            <Popconfirm
              title="Delete user?"
              onConfirm={() => handleDelete(record._id)}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </RoleBasedAccess>
        </Space>
      ),
    },
  ];

  return (
    <>
      <AdminTable
        dataSource={users}
        columns={columns}
        rowKey="_id"
        loading={loading}
      />

      <AdminDrawer
        title={editingUser ? 'Edit user' : 'Create user'}
        saveForm="user-create-form"
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
      >
        <UserCreateForm onClose={closeDrawer} userToEdit={editingUser} />
      </AdminDrawer>
    </>
  );
}
