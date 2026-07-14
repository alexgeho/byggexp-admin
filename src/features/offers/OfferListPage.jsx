import { useEffect, useMemo, useState } from 'react';
import { Tag } from 'antd';
import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import { useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import { useOfferStore } from '@/src/store/offerStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const STATUS_COLORS = {
  draft: 'default',
  sent: 'processing',
  accepted: 'success',
  rejected: 'error',
};

export default function OfferListPage() {
  const { offers, loading, fetchAllAccessible, remove, copy } = useOfferStore();
  const navigate = useNavigate();
  const { registerAddButton, unregisterAddButton } = useOutletContext();
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAllAccessible();
    registerAddButton(() => navigate('new'), 'Add offer');

    return () => unregisterAddButton();
  }, [fetchAllAccessible, navigate, registerAddButton, unregisterAddButton]);

  const statusFilterOptions = useMemo(() => {
    const countByStatus = offers.reduce((accumulator, offer) => {
      const status = String(offer?.status || 'draft').toLowerCase();
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    return [
      { value: 'all', label: 'All', count: offers.length },
      { value: 'draft', label: 'Drafts', count: countByStatus.draft || 0 },
      { value: 'sent', label: 'Sent', count: countByStatus.sent || 0 },
      { value: 'accepted', label: 'Accepted', count: countByStatus.accepted || 0 },
    ];
  }, [offers]);

  const filteredOffers = useMemo(() => {
    if (statusFilter === 'all') {
      return offers;
    }

    return offers.filter((offer) => String(offer?.status || 'draft').toLowerCase() === statusFilter);
  }, [offers, statusFilter]);

  const columns = useMemo(() => [
    {
      title: 'No.',
      dataIndex: 'offerNumber',
      key: 'offerNumber',
      width: 90,
      sorter: (a, b) => Number(a.offerNumber || 0) - Number(b.offerNumber || 0),
    },
    {
      title: 'Customer',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (value) => value || '-',
    },
    {
      title: 'Subtitle',
      dataIndex: 'subtitle',
      key: 'subtitle',
      render: (value) => value || '-',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: formatAdminDate,
    },
    {
      title: 'Valid until',
      dataIndex: 'validUntil',
      key: 'validUntil',
      render: formatAdminDate,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value = 'draft') => (
        <Tag color={STATUS_COLORS[value] || 'default'}>
          {String(value).toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'priceText',
      key: 'priceText',
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
              onClick: () => navigate(`${getEntityId(record)}/edit`),
            },
            {
              key: 'copy',
              label: 'Copy',
              icon: <CopyOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => copy(getEntityId(record)),
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: 'Delete offer?',
              confirmOkText: 'Delete',
              confirmCancelText: 'Cancel',
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [copy, navigate, remove]);

  return (
    <AdminTable
      dataSource={filteredOffers}
      columns={columns}
      rowKey="_id"
      loading={loading}
      scroll={{ x: 1120 }}
      toolbarStart={(
        <StatusPills
          options={statusFilterOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      )}
    />
  );
}
