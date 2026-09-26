'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal, Popconfirm, Select, Space, Table } from 'antd';
import { DeleteOutlined, EditOutlined, UploadOutlined, UserAddOutlined } from '@ant-design/icons';
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
  const [selected, setSelected] = useState([]);
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
      setSelected([]);
      load();
    } catch (err) {
      appMessage.error(apiError(err, t('Could not delete')));
    }
  };

  const columns = [
    { title: t('List'), dataIndex: 'listId', key: 'list', render: (v) => listName.get(v) || '–' },
    { title: t('Email address'), dataIndex: 'email', key: 'email' },
    { title: t('Name'), key: 'name', render: (_, r) => [r.name, r.company].filter(Boolean).join(' · ') || '–' },
    { title: t('City'), dataIndex: 'city', key: 'city', render: (v) => v || '–' },
    { title: t('Checked'), dataIndex: 'verified', key: 'verified', render: (v) => <VerifiedTag value={v} /> },
    { title: t('Status'), dataIndex: 'status', key: 'status', render: (v) => <SubscriberStatusTag status={v} /> },
    {
      key: 'actions',
      align: 'right',
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" icon={<EditOutlined />} onClick={() => setEditing(r)}>{t('Edit')}</Button>
          <Popconfirm title={t('Delete the subscriber?')} okText={t('Delete')} cancelText={t('Cancel')} onConfirm={() => remove([r._id])}>
            <Button type="link" danger icon={<DeleteOutlined />}>{t('Delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="mailer-card">
      <div className="mailer-toolbar">
        <Select
          allowClear
          placeholder={t('All lists')}
          value={filters.listId}
          onChange={(v) => setFilter({ listId: v })}
          options={lists.map((l) => ({ value: l._id, label: `${l.name} (${l.total})` }))}
          style={{ minWidth: 220 }}
        />
        <Select
          allowClear
          placeholder={t('All statuses')}
          value={filters.status}
          onChange={(v) => setFilter({ status: v })}
          options={STATUSES.map((s) => ({ value: s, label: t(STATUS_LABELS[s]) }))}
          style={{ minWidth: 170 }}
        />
        <Input.Search
          allowClear
          placeholder={t('Search email, name, company…')}
          value={filters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          style={{ maxWidth: 320 }}
        />
        <Button icon={<UserAddOutlined />} onClick={addOne} disabled={!lists.length}>{t('Add one')}</Button>
        {selected.length ? (
          <Popconfirm title={t('Delete {x} subscribers?').replace('{x}', selected.length)} okText={t('Delete')} cancelText={t('Cancel')} onConfirm={() => remove(selected)}>
            <Button danger icon={<DeleteOutlined />}>{t('Delete selected')} ({selected.length})</Button>
          </Popconfirm>
        ) : null}
      </div>
      <Table
        rowKey="_id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={data.items}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        locale={{
          emptyText: !loading && !filters.search && !filters.status ? (
            <div className="mailer-empty">
              <p>{t('No subscribers here yet. Import a whole list at once from Excel/CSV or paste addresses.')}</p>
              <Button type="primary" size="large" icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>{t('Import subscribers')}</Button>
            </div>
          ) : undefined,
        }}
        scroll={{ x: 900 }}
        pagination={{
          current: page.page,
          pageSize: page.limit,
          total: data.total,
          showSizeChanger: true,
          pageSizeOptions: [25, 50, 100, 200],
          showTotal: (total, range) => t('Showing {a}–{b} of {c}').replace('{a}', range[0]).replace('{b}', range[1]).replace('{c}', total),
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
    </div>
  );
}
