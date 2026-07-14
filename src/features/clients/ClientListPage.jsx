import { useEffect, useMemo, useState } from 'react';
import { Tag } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import ClientCreateForm from '@/src/features/clients/components/ClientCreateForm';
import { getClientDisplayName } from '@/src/features/clients/clientUtils';
import { useClientStore } from '@/src/store/clientStore';
import { getEntityId } from '@/src/utils/entityId';

export default function ClientListPage() {
  const { clients, loading, fetchAllAccessible, remove } = useClientStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
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

  const statusFilterOptions = useMemo(() => {
    const countByFilter = clients.reduce((accumulator, client) => {
      const clientType = String(client?.clientType || 'company').toLowerCase();
      const paymentStatus = String(
        client?.paymentStatus || client?.invoiceStatus || client?.status || '',
      ).toLowerCase();

      accumulator[clientType] = (accumulator[clientType] || 0) + 1;

      if (paymentStatus === 'paid') {
        accumulator.paid = (accumulator.paid || 0) + 1;
      }

      return accumulator;
    }, {});

    return [
      { value: 'all', label: 'All', count: clients.length },
      { value: 'company', label: 'Business', count: countByFilter.company || 0 },
      { value: 'private', label: 'Private person', count: countByFilter.private || 0 },
      { value: 'paid', label: 'Paid', count: countByFilter.paid || 0 },
    ];
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (statusFilter === 'all') {
      return clients;
    }

    if (statusFilter === 'paid') {
      return clients.filter((client) => {
        const paymentStatus = String(
          client?.paymentStatus || client?.invoiceStatus || client?.status || '',
        ).toLowerCase();

        return paymentStatus === 'paid';
      });
    }

    return clients.filter(
      (client) => String(client?.clientType || 'company').toLowerCase() === statusFilter,
    );
  }, [clients, statusFilter]);

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
        dataSource={filteredClients}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 980 }}
        toolbarStart={(
          <StatusPills
            options={statusFilterOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        )}
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
