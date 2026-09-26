'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input, Modal, Progress, Segmented, Select } from 'antd';
import { CopyOutlined, DeleteOutlined, EditOutlined, SendOutlined } from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { newsletterApi } from '@/src/features/newsletters/newsletterApi';
import { apiError, mailerApi } from './mailerApi';
import { CampaignStatusTag, pct } from './mailerUi';
import './mailer.scss';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'sending', label: 'Sending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Drafts' },
  { value: 'completed', label: 'Completed' },
];

// Used by the list page and by the campaign page's "change" fields.
export function useCampaignOptions() {
  const [newsletters, setNewsletters] = useState([]);
  const [lists, setLists] = useState([]);
  useEffect(() => {
    newsletterApi.list().then(setNewsletters).catch(() => {});
    mailerApi.lists().then(setLists).catch(() => {});
  }, []);
  return {
    newsletterOptions: newsletters.map((n) => ({ value: n._id, label: n.title })),
    listOptions: lists.map((l) => ({ value: l._id, label: `${l.name} (${l.active})` })),
  };
}

export default function MailerCampaignsPage() {
  const t = useT();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);
  const { newsletterOptions, listOptions } = useCampaignOptions();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([mailerApi.campaigns(tab === 'all' ? undefined : tab), mailerApi.campaignCounts()])
      .then(([list, c]) => { setItems(list); setCounts(c); })
      .catch((err) => appMessage.error(apiError(err, t('Could not load campaigns'))))
      .finally(() => setLoading(false));
  }, [tab, t]);
  useEffect(load, [load]);

  // Keep progress moving while something is being sent.
  useEffect(() => {
    if (!items.some((c) => c.status === 'sending')) return undefined;
    const timer = setInterval(() => { if (!document.hidden) load(); }, 20000);
    return () => clearInterval(timer);
  }, [items, load]);

  useAddButton(() => setCreating({ name: '', newsletterId: undefined, listId: undefined }), t('New campaign'));

  const create = async () => {
    try {
      const c = await mailerApi.createCampaign(creating);
      setCreating(null);
      navigate(`/admin/mailer/campaigns/${c._id}`);
    } catch (err) {
      appMessage.error(apiError(err, t('Could not create campaign')));
    }
  };

  const columns = [
    {
      title: t('Campaign'),
      key: 'name',
      width: 340,
      render: (_, c) => (<div className="mailer-camp-name"><b>{c.name}</b><div className="mailer-muted">{c.subject || '–'}</div></div>),
    },
    { title: t('Subscriber list'), dataIndex: 'listName', key: 'list', width: 150, render: (v) => v || '–' },
    { title: t('Status'), dataIndex: 'status', key: 'status', width: 120, render: (v) => <CampaignStatusTag status={v} /> },
    {
      title: t('Sent'),
      key: 'progress',
      width: 170,
      render: (_, c) => (c.stats?.total
        ? <Progress percent={Math.round(((c.stats.sent + c.stats.failed) / c.stats.total) * 100)} size="small" format={() => `${c.stats.sent}/${c.stats.total}`} />
        : '–'),
    },
    { title: t('Opened'), key: 'open', width: 90, render: (_, c) => pct(c.stats?.opened || 0, c.stats?.sent || 0) },
    { title: t('Clicked'), key: 'click', width: 90, render: (_, c) => pct(c.stats?.clicked || 0, c.stats?.sent || 0) },
    {
      title: t('Date'),
      key: 'date',
      width: 170,
      render: (_, c) => formatAdminDateTime(c.completedAt || c.startedAt || c.scheduledAt || c.createdAt),
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, row) => (
        <AdminTableActions
          items={[
            { key: 'open', label: t('Open'), icon: <EditOutlined />, onClick: () => navigate(`/admin/mailer/campaigns/${row._id}`) },
            {
              key: 'dup',
              label: t('Duplicate'),
              icon: <CopyOutlined />,
              onClick: async () => { await mailerApi.duplicateCampaign(row._id); load(); },
            },
            row.status !== 'sending' ? {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              confirmTitle: t('Delete the campaign? Its statistics are deleted too.'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: async () => {
                try { await mailerApi.deleteCampaign(row._id); load(); } catch (err) { appMessage.error(apiError(err, t('Could not delete'))); }
              },
            } : null,
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
        toolbarStart={(
          <div className="mailer-seg">
            <Segmented
              value={tab}
              onChange={setTab}
              options={TABS.map((x) => ({
                value: x.value,
                label: (
                  <span>
                    {t(x.label)}
                    {['sending', 'scheduled'].includes(x.value) ? <span className="mailer-count">{counts[x.value] || 0}</span> : null}
                  </span>
                ),
              }))}
            />
          </div>
        )}
        columns={columns}
        dataSource={items}
        onRowClick={(row) => navigate(`/admin/mailer/campaigns/${row._id}`)}
        emptyState={tab === 'all' ? {
          icon: <SendOutlined />,
          title: t('No campaigns yet'),
          description: t('A campaign sends one of your newsletter designs to a subscriber list.'),
          actionLabel: t('Create your first campaign'),
          onAction: () => setCreating({ name: '' }),
        } : null}
      />

      <Modal
        open={Boolean(creating)}
        title={t('New campaign')}
        okText={t('Create')}
        cancelText={t('Cancel')}
        onOk={create}
        onCancel={() => setCreating(null)}
        destroyOnHidden
      >
        {creating ? (
          <div className="mailer-form">
            <label>
              <span>{t('Name (only shown internally)')}</span>
              <Input value={creating.name} onChange={(e) => setCreating((s) => ({ ...s, name: e.target.value }))} placeholder="Nyhetsbrev oktober" autoFocus />
            </label>
            <label>
              <span>{t('Newsletter (design)')}</span>
              <Select
                value={creating.newsletterId}
                onChange={(v) => setCreating((s) => ({ ...s, newsletterId: v }))}
                options={newsletterOptions}
                placeholder={t('Choose a design')}
                notFoundContent={t('No designs yet — create one under Designs')}
              />
            </label>
            <label>
              <span>{t('Subscriber list')}</span>
              <Select
                value={creating.listId}
                onChange={(v) => setCreating((s) => ({ ...s, listId: v }))}
                options={listOptions}
                placeholder={t('Choose a list')}
                notFoundContent={t('No lists yet — create one under Lists')}
              />
            </label>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
