import { useEffect, useMemo, useState } from 'react';
import { Button, Popconfirm, Space, Tag } from 'antd';
import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import AdminDrawer from '@/src/shared/components/AdminDrawer';
import AdminTable from '@/src/shared/components/AdminTable';
import RoleBasedAccess from '@/src/shared/auth/RoleBasedAccess';
import { useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import OfferForm from '@/src/features/offers/components/OfferForm';
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
  const [editingOffer, setEditingOffer] = useState(null);
  const navigate = useNavigate();
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const showEditDrawer = (offerToEdit) => {
    setEditingOffer(offerToEdit);
  };

  const closeDrawer = () => {
    setEditingOffer(null);
  };

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
      title: 'Actions',
      key: 'actions',
      width: 150,
      ellipsis: false,
      render: (_, record) => (
        <Space size="small">
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => showEditDrawer(record)}
            />
          </RoleBasedAccess>
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Button
              type="link"
              icon={<CopyOutlined />}
              onClick={() => copy(getEntityId(record))}
            />
          </RoleBasedAccess>
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Popconfirm
              title="Delete offer?"
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
  ], [copy, remove]);

  return (
    <>
      <AdminTable
        dataSource={offers}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 1120 }}
      />

      <AdminDrawer
        title="Edit offer"
        saveText="Save offer"
        saveForm="offer-form"
        open={Boolean(editingOffer)}
        onClose={closeDrawer}
        destroyOnClose
        width={860}
      >
        <OfferForm onClose={closeDrawer} offerToEdit={editingOffer} />
      </AdminDrawer>
    </>
  );
}
