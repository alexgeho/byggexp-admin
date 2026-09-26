'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal } from 'antd';
import {
  CopyOutlined, DeleteOutlined, EditOutlined, FileTextOutlined, LayoutOutlined, MailOutlined,
} from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { newsletterApi } from './newsletterApi';
import './NewsletterEditorPage.scss';

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

  const [chooserOpen, setChooserOpen] = useState(false);

  const createNew = async (template) => {
    setChooserOpen(false);
    try {
      const doc = await newsletterApi.create({ template });
      navigate(`/admin/newsletters/${doc._id}`);
    } catch {
      appMessage.error(t('Could not create newsletter'));
    }
  };
  const openChooser = () => setChooserOpen(true);

  useAddButton(openChooser, t('New newsletter'));

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

  const templates = [
    {
      key: 'newsletter',
      icon: <LayoutOutlined />,
      title: t('Newsletter (design)'),
      text: t('Logo, menu, images, product cards and buttons. For news to existing customers.'),
    },
    {
      key: 'personal',
      icon: <FileTextOutlined />,
      title: t('Personal letter'),
      text: t('Plain text with a signature, like a normal email. Best for first contact with new companies.'),
    },
  ];

  return (
    <>
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
          onAction: openChooser,
        }}
      />
      <Modal open={chooserOpen} title={t('Choose a template')} footer={null} onCancel={() => setChooserOpen(false)}>
        <div className="nl-templates">
          {templates.map((tpl) => (
            <button type="button" key={tpl.key} className="nl-templates__item" onClick={() => createNew(tpl.key)}>
              <span className="nl-templates__icon">{tpl.icon}</span>
              <span>
                <strong>{tpl.title}</strong>
                <span>{tpl.text}</span>
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
