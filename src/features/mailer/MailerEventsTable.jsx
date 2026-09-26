'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input, Segmented, Table } from 'antd';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { useT } from '@/src/i18n/LanguageProvider';
import { mailerApi } from './mailerApi';
import { EVENT_TYPES, EventTag } from './mailerUi';

// Live event log ("Realtidslogg"); also embedded on a campaign's page.
// Polls while visible so opens/clicks show up without reloading.
export default function MailerEventsTable({ campaignId, refreshMs = 15000, showCampaign = true }) {
  const t = useT();
  const [type, setType] = useState();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState({ page: 1, limit: 50 });
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => mailerApi
    .events({ campaignId, type, search: search || undefined, ...page })
    .then(setData)
    .catch(() => {})
    .finally(() => setLoading(false)), [campaignId, type, search, page]);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, refreshMs);
    return () => clearInterval(timer);
  }, [load, refreshMs]);

  const columns = [
    { title: t('Time'), dataIndex: 'createdAt', key: 'createdAt', width: 170, render: formatAdminDateTime },
    { title: t('Event'), dataIndex: 'type', key: 'type', width: 140, render: (v) => <EventTag type={v} /> },
    { title: t('Email address'), dataIndex: 'email', key: 'email' },
    ...(showCampaign ? [{ title: t('Campaign'), dataIndex: 'campaignName', key: 'campaign', render: (v) => v || '–' }] : []),
    { title: t('Details'), dataIndex: 'detail', key: 'detail', ellipsis: true, render: (v) => v || '' },
  ];

  return (
    <>
      <div className="mailer-toolbar">
        <div className="mailer-seg">
          <Segmented
            value={type || 'all'}
            onChange={(v) => { setType(v === 'all' ? undefined : v); setPage((p) => ({ ...p, page: 1 })); }}
            options={[
              { value: 'all', label: t('All events') },
              ...Object.entries(EVENT_TYPES).map(([k, v]) => ({ value: k, label: t(v.label) })),
            ]}
          />
        </div>
        <Input.Search
          allowClear
          placeholder={t('Search email…')}
          onSearch={(v) => { setSearch(v); setPage((p) => ({ ...p, page: 1 })); }}
          style={{ maxWidth: 280 }}
        />
      </div>
      <Table
        rowKey="_id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={data.items}
        scroll={{ x: 800 }}
        locale={{ emptyText: t('No events yet. Opens, clicks, unsubscribes and bounces show up here.') }}
        pagination={{
          current: page.page,
          pageSize: page.limit,
          total: data.total,
          showSizeChanger: false,
          onChange: (p) => setPage((s) => ({ ...s, page: p })),
        }}
      />
    </>
  );
}
