import { useEffect, useMemo } from 'react';
import { Tag } from 'antd';
import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import { useOfferStore } from '@/src/store/offerStore';
import { getEntityId } from '@/src/utils/entityId';

const STATUS_COLORS = {
  draft: 'default',
  sent: 'processing',
  accepted: 'success',
  rejected: 'error',
};

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat('sv-SE').format(new Date(parsed));
};

export default function OfferListPage() {
  const { offers, loading, fetchAllAccessible, remove, copy } = useOfferStore();
  const navigate = useNavigate();
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  useEffect(() => {
    fetchAllAccessible();
    registerAddButton(() => navigate('new'), 'Add offer');

    return () => unregisterAddButton();
  }, [fetchAllAccessible, navigate, registerAddButton, unregisterAddButton]);

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
      render: formatDate,
    },
    {
      title: 'Valid until',
      dataIndex: 'validUntil',
      key: 'validUntil',
      render: formatDate,
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
      dataSource={offers}
      columns={columns}
      rowKey="_id"
      loading={loading}
      scroll={{ x: 1120 }}
    />
  );
}
