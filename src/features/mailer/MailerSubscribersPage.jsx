'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal, Select } from 'antd';
import { DeleteOutlined, EditOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { useLocation } from '@/src/shared/routing/routerCompat';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { apiError, mailerApi } from './mailerApi';
import { SubscriberStatusTag, VerifiedTag } from './mailerUi';
import ListImportDrawer from './ListImportDrawer';
import './mailer.scss';

const STATUSES = ['active', 'unsubscribed', 'bounced', 'complained'];
const STATUS_LABELS = { active: 'Active', unsubscribed: 'Unsubscribed', bounced: 'Bounced', complained: 'Spam complaint' };

export default function MailerSubscribersPage() {
  const t = useT();
  const { search: qs } = useLocation();
  const initialList = useMemo(() => new URLSearchParams(qs).get('listId') || undefined, [qs]);

  const [lists, setLists] = useState([]);
  const [filters, setFilters] = useState({ listId: initialList, status: undefined, search: '' });
  const [page, setPage] = useState({ page: 1, limit: 25 });
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const loadLists = useCallback(() => { mailerApi.lists().then(setLists).catch(() => {}); }, []);
  useEffect(loadLists, [loadLists]);
  useEffect(() => { setFilters((f) => ({ ...f, listId: initialList })); }, [initialList]);

  const load = useCallback(() => {
    setLoading(true);
    mailerApi.subscribers({ ...filters, ...page })
      .then(setData)
      .catch((err) => appMessage.error(apiError(err, t('Could not load subscribers'))))
      .finally(() => setLoading(false));
  }, [filters, page, t]);

  useEffect(() => {
    const timer = setTimeout(load, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, filters.search]);

  const listName = useMemo(() => new Map(lists.map((l) => [l._id, l.name])), [lists]);

  // Bulk import is the main way in; single adds live in the toolbar.
  useAddButton(() => setImportOpen(true), t('Import subscribers'));
  const addOne = () => setEditing({ listId: filters.listId || lists[0]?._id, email: '', name: '', company: '', city: '' });
  const currentList = lists.find((l) => l._id === filters.listId) || null;

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage((p) => ({ ...p, page: 1 }));
  };

  const save = async () => {
    try {
      if (editing._id) {
        await mailerApi.updateSubscriber(editing._id, {
          name: editing.name, company: editing.company, city: editing.city, status: editing.status,
        });
      } else {
        await mailerApi.addSubscriber(editing);
      }
      setEditing(null);
      load();
    } catch (err) {
      appMessage.error(apiError(err, t('Could not save')));
    }
  };

  const remove = async (ids) => {
    try {
      await mailerApi.deleteSubscribers(ids);
      load();
    } catch (err) {
      appMessage.error(apiError(err, t('Could not delete')));
    }
  };

  const columns = [
    { title: t('Email address'), dataIndex: 'email', key: 'email', width: 260 },
    { title: t('Name'), key: 'name', render: (_, r) => [r.name, r.company].filter(Boolean).join(' · ') || '–' },
    { title: t('City'), dataIndex: 'city', key: 'city', width: 140, render: (v) => v || '–' },
    { title: t('List'), dataIndex: 'listId', key: 'list', width: 160, render: (v) => listName.get(v) || '–' },
    { title: t('Checked'), dataIndex: 'verified', key: 'verified', width: 160, render: (v) => <VerifiedTag value={v} /> },
    { title: t('Status'), dataIndex: 'status', key: 'status', width: 130, render: (v) => <SubscriberStatusTag status={v} /> },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, r) => (
        <AdminTableActions
          items={[
            { key: 'edit', label: t('Edit'), icon: <EditOutlined />, onClick: () => setEditing(r) },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              confirmTitle: t('Delete the subscriber?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove([r._id]),
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
        dataSource={data.items}
        onRowClick={(r) => setEditing(r)}
        searchValue={filters.search}
        onSearchChange={(v) => setFilter({ search: v })}
        onBulkDelete={(rows) => remove(rows.map((r) => r._id))}
        bulkDeleteTitle={t('Delete the selected subscribers?')}
        toolbarStart={(
          <>
            <Select
              allowClear
              placeholder={t('All lists')}
              value={filters.listId}
              onChange={(v) => setFilter({ listId: v })}
              options={lists.map((l) => ({ value: l._id, label: `${l.name} (${l.total})` }))}
              style={{ minWidth: 200 }}
            />
            <Select
              allowClear
              placeholder={t('All statuses')}
              value={filters.status}
              onChange={(v) => setFilter({ status: v })}
              options={STATUSES.map((st) => ({ value: st, label: t(STATUS_LABELS[st]) }))}
              style={{ minWidth: 160 }}
            />
          </>
        )}
        toolbarEnd={<Button icon={<UserAddOutlined />} onClick={addOne} disabled={!lists.length}>{t('Add one')}</Button>}
        emptyState={!filters.status && !filters.listId ? {
          icon: <TeamOutlined />,
          title: t('No subscribers yet'),
          description: t('No subscribers here yet. Import a whole list at once from Excel/CSV or paste addresses.'),
          actionLabel: t('Import subscribers'),
          onAction: () => setImportOpen(true),
        } : null}
        pagination={{
          current: page.page,
          pageSize: page.limit,
          total: data.total,
          showSizeChanger: true,
          pageSizeOptions: [25, 50, 100, 200],
          onChange: (p, limit) => setPage({ page: p, limit }),
        }}
      />

      <ListImportDrawer
        list={currentList}
        lists={lists}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => { load(); loadLists(); }}
      />

      <Modal
        open={Boolean(editing)}
        title={editing?._id ? editing.email : t('New subscriber')}
        okText={t('Save')}
        cancelText={t('Cancel')}
        onOk={save}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        {editing ? (
          <div className="mailer-form">
            {!editing._id ? (
              <>
                <label>
                  <span>{t('List')}</span>
                  <Select value={editing.listId} onChange={(v) => setEditing((s) => ({ ...s, listId: v }))} options={lists.map((l) => ({ value: l._id, label: l.name }))} />
                </label>
                <label>
                  <span>{t('Email address')} *</span>
                  <Input type="email" value={editing.email} onChange={(e) => setEditing((s) => ({ ...s, email: e.target.value }))} />
                </label>
              </>
            ) : null}
            <label><span>{t('Name')}</span><Input value={editing.name} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} /></label>
            <label><span>{t('Company')}</span><Input value={editing.company} onChange={(e) => setEditing((s) => ({ ...s, company: e.target.value }))} /></label>
            <label><span>{t('City')}</span><Input value={editing.city} onChange={(e) => setEditing((s) => ({ ...s, city: e.target.value }))} /></label>
            {editing._id ? (
              <label>
                <span>{t('Status')}</span>
                <Select value={editing.status} onChange={(v) => setEditing((s) => ({ ...s, status: v }))} options={STATUSES.map((s) => ({ value: s, label: t(STATUS_LABELS[s]) }))} />
                <span className="mailer-muted">{t('Setting Active again lifts the block — only do it if the person asked to get mail again.')}</span>
              </label>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
