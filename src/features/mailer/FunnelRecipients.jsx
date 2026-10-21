'use client';

import { Input, Segmented } from 'antd';
import { PlainTable } from '@/src/shared/components/DataTable';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { useT } from '@/src/i18n/LanguageProvider';

// Every company the funnel's campaigns went to, by delivery state (admin only).
// `data` = GET /mailer/funnel/recipients; `query` = { status, search, page }.
export default function FunnelRecipients({ data, query, onQuery }) {
  const t = useT();
  const counts = data?.counts || {};
  const status = data?.status || query.status;
  const states = [
    { value: 'sent', label: `${t('Sent')} ${counts.sent ?? 0}` },
    { value: 'queued', label: `${t('In queue')} ${counts.queued ?? 0}` },
    ...(counts.failed ? [{ value: 'failed', label: `${t('Failed')} ${counts.failed}` }] : []),
  ];

  const columns = [
    {
      title: t('Company'),
      key: 'company',
      width: 240,
      render: (_, r) => (<div><b>{r.company}</b><div className="mailer-muted">{r.name ? `${r.name} · ` : ''}{r.email}</div></div>),
    },
    { title: t('Campaign'), dataIndex: 'campaignName', width: 200 },
    ...(status === 'sent' ? [
      { title: t('Sent'), dataIndex: 'sentAt', width: 100, render: (v) => formatAdminDate(v) },
      { title: t('Opened'), dataIndex: 'openedAt', width: 100, render: (v) => (v ? formatAdminDate(v) : null) },
      { title: t('Clicked'), dataIndex: 'clickedAt', width: 100, render: (v) => (v ? formatAdminDate(v) : null) },
      { title: t('Replied'), dataIndex: 'replied', width: 90, render: (v) => (v ? t('Yes') : null) },
    ] : []),
    ...(status === 'failed' ? [{ title: t('Failed'), dataIndex: 'error', width: 260 }] : []),
  ];

  return (
    <>
      <div className="mfunnel__toolbar">
        <Segmented value={status} onChange={(s) => onQuery({ status: s, page: 1 })} options={states} />
        <Input.Search
          allowClear
          className="mfunnel__search"
          placeholder={t('Search email, name, company…')}
          defaultValue={query.search}
          onSearch={(search) => onQuery({ search, page: 1 })}
        />
      </div>
      <PlainTable
        rowKey="_id"
        size="middle"
        loading={!data}
        columns={columns}
        dataSource={data?.items || []}
        pagination={{
          current: data?.page || 1,
          pageSize: data?.limit || 50,
          total: data?.total || 0,
          showSizeChanger: false,
          hideOnSinglePage: true,
          onChange: (page) => onQuery({ page }),
        }}
        scroll={{ x: 800 }}
      />
    </>
  );
}
