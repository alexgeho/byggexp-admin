import { useEffect, useMemo, useState } from 'react';
import { Tag } from 'antd';
import { ContactsOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import useAddButton from '@/src/shared/hooks/useAddButton';
import useAutoOpenCreate from '@/src/shared/hooks/useAutoOpenCreate';
import useBulkDelete from '@/src/shared/hooks/useBulkDelete';
import ClientCreateForm from '@/src/features/clients/components/ClientCreateForm';
import { getClientDisplayName } from '@/src/features/clients/clientUtils';
import { useClientStore } from '@/src/store/clientStore';
import { useAuthStore } from '@/src/store/authStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';

export default function ClientListPage() {
  const { clients, loading, fetchAllAccessible, remove } = useClientStore();
  const userRole = useAuthStore((s) => s.user?.role);
  const canDelete = ['superadmin', 'companyAdmin'].includes(userRole);
  const bulkDelete = useBulkDelete(remove);
  const t = useT();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

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
  }, [fetchAllAccessible]);

  useAddButton(() => showModal(), 'Add client');
  useAutoOpenCreate(() => showModal());

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
      { value: 'all', label: t('All'), count: clients.length },
      { value: 'company', label: t('Business'), count: countByFilter.company || 0 },
      { value: 'private', label: t('Private person'), count: countByFilter.private || 0 },
      { value: 'paid', label: t('Paid'), count: countByFilter.paid || 0 },
    ];
  }, [clients, t]);

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
      title: t('Customer no.'),
      dataIndex: 'customerNumber',
      key: 'customerNumber',
      width: 120,
    },
    {
      title: t('Name'),
      key: 'name',
      render: (_, record) => getClientDisplayName(record),
    },
    {
      title: t('Type'),
      dataIndex: 'clientType',
      key: 'clientType',
      width: 120,
      render: (value = 'company') => (
        <Tag color={value === 'private' ? 'purple' : 'blue'}>
          {value === 'private' ? t('Private client') : t('Company')}
        </Tag>
      ),
    },
    {
      title: t('Org no.'),
      dataIndex: 'orgNumber',
      key: 'orgNumber',
      render: (value) => value || '-',
    },
    {
      title: t('City'),
      dataIndex: 'city',
      key: 'city',
      render: (value) => value || '-',
    },
    {
      title: t('Email'),
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
              label: t('Edit'),
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => showModal(record),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: t('Delete client?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [remove, t]);

  return (
    <>
      <AdminTable
        dataSource={filteredClients}
        columns={columns}
        rowKey="_id"
        loading={loading}
        onBulkDelete={canDelete ? bulkDelete : null}
        scroll={{ x: 980 }}
        statusFilter={(
          <StatusPills
            options={statusFilterOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        )}
        emptyState={{
          icon: <ContactsOutlined />,
          title: t('No clients yet'),
          description: t('You need a client to send offers and invoices. Add your first one.'),
          actionLabel: t('Add your first client'),
          onAction: () => showModal(),
        }}
      />

      <AdminModal
        title={editingClient ? t('Edit client') : t('Create client')}
        saveForm="client-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
        // Create is a step-by-step wizard that renders its own Back/Next footer;
        // hide the built-in Cancel/Save row for it. Edit keeps the single form.
        footer={editingClient ? undefined : null}
      >
        <ClientCreateForm onClose={closeModal} clientToEdit={editingClient} />
      </AdminModal>
    </>
  );
}
