import { useEffect, useMemo, useState } from 'react';
import { Tag } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import ClientCreateForm from '@/src/features/clients/components/ClientCreateForm';
import { getClientDisplayName } from '@/src/features/clients/clientUtils';
import { useClientStore } from '@/src/store/clientStore';
import { getEntityId } from '@/src/utils/entityId';

export default function ClientListPage() {
  const { clients, loading, fetchAllAccessible, remove } = useClientStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const showModal = (clientToEdit = null) => {
    setEditingClient(clientToEdit);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingClient(null);
    setModalOpen(false);
  };

  useEffect(() => {
    fetchAllAccessible();
    registerAddButton(() => showModal(), 'Add client');

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
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
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
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: 'Delete client?',
              confirmOkText: 'Delete',
              confirmCancelText: 'Cancel',
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
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

      <AdminModal
        title={editingClient ? 'Edit client' : 'Create client'}
        saveForm="client-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
      >
        <ClientCreateForm onClose={closeModal} clientToEdit={editingClient} />
      </AdminModal>
    </>
  );
}
