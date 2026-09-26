'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input, Modal } from 'antd';
import {
  DeleteOutlined, EditOutlined, SafetyCertificateOutlined, TeamOutlined, UnorderedListOutlined, UploadOutlined,
} from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { apiError, mailerApi } from './mailerApi';
import ListImportDrawer from './ListImportDrawer';
import './mailer.scss';

export default function MailerListsPage() {
  const t = useT();
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // {} = new
  const [importFor, setImportFor] = useState(null);
  const [verifying, setVerifying] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    mailerApi.lists()
      .then(setLists)
      .catch((err) => appMessage.error(apiError(err, t('Could not load lists'))))
      .finally(() => setLoading(false));
  }, [t]);
  useEffect(load, [load]);

  useAddButton(() => setEditing({ name: '', description: '' }), t('New list'));

  const save = async () => {
    try {
      if (editing._id) await mailerApi.updateList(editing._id, { name: editing.name, description: editing.description });
      else {
        const created = await mailerApi.createList({ name: editing.name, description: editing.description });
        setImportFor(created); // straight to import — that's what you want next
      }
      setEditing(null);
      load();
    } catch (err) {
      appMessage.error(apiError(err, t('Could not save')));
    }
  };

  const verify = async (list) => {
    setVerifying(list._id);
    try {
      const r = await mailerApi.verifyList(list._id);
      appMessage.success(
        t('Checked {x} addresses: {v} OK, {i} not deliverable')
          .replace('{x}', r.checked).replace('{v}', r.valid).replace('{i}', r.invalid),
      );
      load();
    } catch (err) {
      appMessage.error(apiError(err, t('Check failed')));
    } finally {
      setVerifying(null);
    }
  };

  const columns = [
    { title: t('Name'), dataIndex: 'name', key: 'name', render: (v, r) => (<><b>{v}</b>{r.description ? <div className="mailer-muted">{r.description}</div> : null}</>) },
    { title: t('Subscribers'), dataIndex: 'total', key: 'total' },
    { title: t('Active'), dataIndex: 'active', key: 'active' },
    { title: t('Unsubscribed'), dataIndex: 'unsubscribed', key: 'unsubscribed' },
    { title: t('Bounced'), dataIndex: 'bounced', key: 'bounced' },
    { title: t('Created'), dataIndex: 'createdAt', key: 'createdAt', render: formatAdminDateTime },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, row) => (
        <AdminTableActions
          items={[
            { key: 'import', label: t('Import subscribers'), icon: <UploadOutlined />, onClick: () => setImportFor(row) },
            { key: 'subs', label: t('Show subscribers'), icon: <TeamOutlined />, onClick: () => navigate(`/admin/mailer/subscribers?listId=${row._id}`) },
            { key: 'verify', label: verifying === row._id ? t('Checking…') : t('Check addresses'), icon: <SafetyCertificateOutlined />, onClick: () => verify(row) },
            { key: 'edit', label: t('Rename'), icon: <EditOutlined />, onClick: () => setEditing(row) },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              confirmTitle: t('Delete the list and all its subscribers?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: async () => {
                try {
                  await mailerApi.deleteList(row._id);
                  load();
                } catch (err) {
                  appMessage.error(apiError(err, t('Could not delete')));
                }
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <AdminTable
        rowKey="_id"
        loading={loading}
        columns={columns}
        dataSource={lists}
        onRowClick={(row) => navigate(`/admin/mailer/subscribers?listId=${row._id}`)}
        emptyState={{
          icon: <UnorderedListOutlined />,
          title: t('No subscriber lists yet'),
          description: t('Create a list and import addresses from a CSV or Excel file.'),
          actionLabel: t('Create your first list'),
          onAction: () => setEditing({ name: '', description: '' }),
        }}
      />

      <Modal
        open={Boolean(editing)}
        title={editing?._id ? t('Rename list') : t('New subscriber list')}
        okText={t('Save')}
        cancelText={t('Cancel')}
        onOk={save}
        onCancel={() => setEditing(null)}
        okButtonProps={{ disabled: !editing?.name?.trim() }}
        destroyOnHidden
      >
        <div className="mailer-form">
          <label>
            <span>{t('Name (only shown internally)')}</span>
            <Input value={editing?.name} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} placeholder="Elektriker Stockholm" autoFocus />
          </label>
          <label>
            <span>{t('Description')}</span>
            <Input value={editing?.description} onChange={(e) => setEditing((s) => ({ ...s, description: e.target.value }))} />
          </label>
        </div>
      </Modal>

      <ListImportDrawer list={importFor} open={Boolean(importFor)} onClose={() => setImportFor(null)} onDone={load} />
    </>
  );
}
