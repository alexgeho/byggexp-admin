'use client';

import { useCallback, useEffect, useState } from 'react';
import { message, Tag } from 'antd';
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import useBulkDelete from '@/src/shared/hooks/useBulkDelete';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useT } from '@/src/i18n/LanguageProvider';

const fmt = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

// Superadmin-only: self-serve sign-up requests that haven't confirmed their
// email yet. Confirmed ones become companies (see the Companies page).
export default function RegistrationsListPage() {
  const t = useT();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/admin/pending-registrations');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      message.error(t('Failed to load registration requests'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/admin/pending-registrations/${id}`);
      message.success(t('Request deleted'));
      setItems((prev) => prev.filter((r) => r._id !== id));
    } catch {
      message.error(t('Failed to delete request'));
    }
  };

  const removeRegistration = useCallback(
    (id) => apiClient.delete(`/admin/pending-registrations/${id}`),
    [],
  );
  const bulkDelete = useBulkDelete(removeRegistration, fetchAll);

  const now = Date.now();

  const columns = [
    { title: t('Email'), dataIndex: 'email', key: 'email' },
    {
      title: t('Name / company'),
      key: 'name',
      render: (_, r) => r.companyName || r.userName || '—',
    },
    {
      title: t('Requested'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => fmt(v),
    },
    {
      title: t('Status'),
      key: 'status',
      // Wide enough (no ellipsis) so "Awaiting confirmation" isn't truncated.
      width: 200,
      ellipsis: false,
      render: (_, r) => {
        const expired = r.expiresAt && new Date(r.expiresAt).getTime() < now;
        return expired ? (
          <Tag color="default">{t('Expired')}</Tag>
        ) : (
          <Tag color="orange">{t('Awaiting confirmation')}</Tag>
        );
      },
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin'],
              confirmTitle: 'Delete request?',
              confirmOkText: 'Delete',
              confirmCancelText: 'Cancel',
              onClick: () => handleDelete(record._id),
            },
          ]}
        />
      ),
    },
  ];

  const toolbarEnd = (
    <Button icon={<ReloadOutlined />} onClick={fetchAll}>
      {t('Refresh')}
    </Button>
  );

  return (
    <AdminTable
      dataSource={items}
      columns={columns}
      rowKey="_id"
      loading={loading}
      toolbarStart={null}
      toolbarEnd={toolbarEnd}
      onBulkDelete={bulkDelete}
    />
  );
}
