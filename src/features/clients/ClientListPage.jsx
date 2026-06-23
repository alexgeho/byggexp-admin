import { useEffect, useMemo, useState } from 'react';
import { Button, Popconfirm, Space, Tag } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import AdminDrawer from '@/src/shared/components/AdminDrawer';
import AdminTable from '@/src/shared/components/AdminTable';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import ClientCreateForm from '@/src/features/clients/components/ClientCreateForm';
import { getClientDisplayName } from '@/src/features/clients/clientUtils';
import { useClientStore } from '@/src/store/clientStore';
import { getEntityId } from '@/src/utils/entityId';

export default function ClientListPage() {
  const { clients, loading, fetchAllAccessible, remove } = useClientStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const showDrawer = (clientToEdit = null) => {
    setEditingClient(clientToEdit);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setEditingClient(null);
    setDrawerOpen(false);
  };

  useEffect(() => {
    fetchAllAccessible();
    registerAddButton(() => showDrawer(), 'Add client');

    return () => unregisterAddButton();
  }, [fetchAllAccessible, registerAddButton, unregisterAddButton]);

  const columns = useMemo(() => [
    {
      title: 'Customer no.',
      dataIndex: 'customerNumber',
      key: 'customerNumber',
      width: 120,
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => getClientDisplayName(record),
    },
    {
      title: 'Type',
      dataIndex: 'clientType',
      key: 'clientType',
      width: 120,
      render: (value = 'company') => (
        <Tag color={value === 'private' ? 'purple' : 'blue'}>
          {value === 'private' ? 'Private' : 'Company'}
        </Tag>
      ),
    },
    {
      title: 'Org no.',
      dataIndex: 'orgNumber',
      key: 'orgNumber',
      render: (value) => value || '-',
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      render: (value) => value || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (value) => value || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      ellipsis: false,
      render: (_, record) => (
        <Space size="small">
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => showDrawer(record)}
            />
          </RoleBasedAccess>
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Popconfirm
              title="Delete client?"
              onConfirm={() => remove(getEntityId(record))}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </RoleBasedAccess>
        </Space>
      ),
    },
  ], [remove]);

  return (
    <>
      <AdminTable
        dataSource={clients}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 980 }}
      />

      <AdminDrawer
        title={editingClient ? 'Edit client' : 'Create client'}
        saveForm="client-create-form"
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
        width={960}
      >
        <ClientCreateForm onClose={closeDrawer} clientToEdit={editingClient} />
      </AdminDrawer>
    </>
  );
}
