'use client';

import { useCallback, useEffect, useState } from 'react';
import { message, Modal, Tag } from 'antd';
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';

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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/admin/pending-registrations');
      setItems(Array.isArray(data) ? data : []);
    } catch {
      message.error('Failed to load registration requests');
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
      message.success('Request deleted');
      setItems((prev) => prev.filter((r) => r._id !== id));
      setSelected((prev) => prev.filter((r) => r._id !== id));
    } catch {
      message.error('Failed to delete request');
    }
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: 'Delete selected requests?',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        let ok = 0;
        let fail = 0;
        for (const r of selected) {
          try {
            await apiClient.delete(`/admin/pending-registrations/${r._id}`);
            ok += 1;
          } catch {
            fail += 1;
          }
        }
        if (ok) message.success(`${ok} deleted`);
        if (fail) message.error(`${fail} could not be deleted`);
        setSelected([]);
        fetchAll();
      },
    });
  };

  const now = Date.now();

  const columns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Name / company',
      key: 'name',
      render: (_, r) => r.companyName || r.userName || '—',
    },
    {
      title: 'Requested',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => fmt(v),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        const expired = r.expiresAt && new Date(r.expiresAt).getTime() < now;
        return expired ? (
          <Tag color="default">Expired</Tag>
        ) : (
          <Tag color="orange">Awaiting confirmation</Tag>
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
              label: 'Delete',
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
    <>
      {selected.length ? (
        <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
          Delete ({selected.length})
        </Button>
      ) : null}
      <Button icon={<ReloadOutlined />} onClick={fetchAll}>
        Refresh
      </Button>
    </>
  );

  return (
    <AdminTable
      dataSource={items}
      columns={columns}
      rowKey="_id"
      loading={loading}
      toolbarStart={null}
      toolbarEnd={toolbarEnd}
      rowSelection={{
        selectedRowKeys: selected.map((r) => r._id),
        onChange: (_keys, rows) => setSelected(rows),
      }}
    />
  );
}
