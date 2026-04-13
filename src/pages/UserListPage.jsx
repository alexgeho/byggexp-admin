import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Drawer, Tag, Popconfirm, message, Space } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { useCompaniesInfo } from '../hooks/useEntitiesInfo';
import UserCreateForm from '../components/UserCreateForm';
import { useOutletContext } from 'react-router-dom';
import RoleBasedAccess from '../components/RoleBasedAccess';

export default function UserListPage() {
  const { users, loading, fetchAll, fetchByCompany, remove, update } = useUserStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { registerAddButton, unregisterAddButton } = useOutletContext();
  const user = useAuthStore((state) => state.user);

  const companyIds = useMemo(() => 
    users.map(u => u.companyId).filter(Boolean),
    [users]
  );
  const { companies } = useCompaniesInfo(companyIds);

  const showDrawer = (userToEdit = null) => {
    setEditingUser(userToEdit);
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setEditingUser(null);
    setDrawerOpen(false);
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (user?.role === 'superadmin') {
          await fetchAll();
        } else if (user?.role === 'companyAdmin' && user?.companyId) {
          await fetchByCompany(user.companyId);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };

    loadUsers();
    registerAddButton(() => showDrawer(), 'Add user');
    return () => unregisterAddButton();
  }, [user, fetchAll, fetchByCompany, registerAddButton, unregisterAddButton]);

  const handleDelete = async (id) => {
    try {
      await remove(id);
      message.success('Пользователь удалён');
    } catch {
      message.error('Ошибка при удалении пользователя');
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
        <Tag color={getRoleColor(role)}>{role}</Tag>
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
      render: (_, record) => (
        <Space size="small">
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => showDrawer(record)}
            />
          </RoleBasedAccess>
          <RoleBasedAccess allowedRoles={['superadmin']}>
            <Popconfirm
              title="Удалить пользователя?"
              onConfirm={() => handleDelete(record._id)}
              okText="Да"
              cancelText="Отмена"
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
      <Table
        dataSource={users}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
      />

      <Drawer
        title={editingUser ? 'Edit user' : 'Create user'}
        width={520}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={closeDrawer} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" form="user-create-form" key="submit" htmlType="submit">Save</Button>
          </div>
        }
      >
        <UserCreateForm onClose={closeDrawer} userToEdit={editingUser} />
      </Drawer>
    </>
  );
}
