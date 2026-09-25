'use client';

import { useCallback, useEffect, useState } from 'react';
import { CopyOutlined, DeleteOutlined, EditOutlined, MailOutlined } from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { newsletterApi } from './newsletterApi';

// Superadmin: ByggExp's own marketing newsletters (drafts built from blocks).
export default function NewsletterListPage() {
  const t = useT();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    newsletterApi
      .list()
      .then(setItems)
      .catch(() => appMessage.error(t('Could not load newsletters')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(load, [load]);

  const createNew = async () => {
    try {
      const doc = await newsletterApi.create({});
      navigate(`/admin/newsletters/${doc._id}`);
    } catch {
      appMessage.error(t('Could not create newsletter'));
    }
  };

  useAddButton(createNew, t('New newsletter'));

  const duplicate = async (id) => {
    try {
      await newsletterApi.duplicate(id);
      load();
    } catch {
      appMessage.error(t('Could not duplicate newsletter'));
    }
  };

  const remove = async (id) => {
    try {
      await newsletterApi.remove(id);
      setItems((prev) => prev.filter((n) => n._id !== id));
    } catch {
      appMessage.error(t('Could not delete newsletter'));
    }
  };

  const columns = [
    { title: t('Title'), dataIndex: 'title', key: 'title' },
    { title: t('Subject line'), dataIndex: 'subject', key: 'subject', render: (v) => v || '-' },
    { title: t('Last changed'), dataIndex: 'updatedAt', key: 'updatedAt', render: formatAdminDateTime },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, row) => (
        <AdminTableActions
          items={[
            { key: 'edit', label: t('Edit'), icon: <EditOutlined />, onClick: () => navigate(`/admin/newsletters/${row._id}`) },
            { key: 'duplicate', label: t('Duplicate'), icon: <CopyOutlined />, onClick: () => duplicate(row._id) },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              confirmTitle: t('Delete this newsletter?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(row._id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <AdminTable
      rowKey="_id"
      loading={loading}
      columns={columns}
      dataSource={items}
      onRowClick={(row) => navigate(`/admin/newsletters/${row._id}`)}
      emptyState={{
        icon: <MailOutlined />,
        title: t('No newsletters yet'),
        description: t('Build a mailing from ready-made blocks — images, text, buttons and product cards.'),
        actionLabel: t('Create your first newsletter'),
        onAction: createNew,
      }}
    />
  );
}
