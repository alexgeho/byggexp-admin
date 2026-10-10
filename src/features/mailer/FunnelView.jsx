'use client';

import { useState } from 'react';
import { Input, Segmented, Select, Tag, Tooltip } from 'antd';
import { PlainTable } from '@/src/shared/components/DataTable';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { useT } from '@/src/i18n/LanguageProvider';
import { CampaignStatusTag } from './mailerUi';
import './mailer.scss';
import './funnel.scss';

// Cold-mail funnel shared by the admin page and the public share link:
// stage bars, campaign comparison, replies and sign-ups. `editable` lets the
// admin classify replies; the public view is read-only.

export const STAGES = [
  { key: 'sent', label: 'Sent' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'opened', label: 'Opened' },
  { key: 'clicked', label: 'Clicked' },
  { key: 'replied', label: 'Replied' },
  { key: 'interest', label: 'Interested' },
  { key: 'registered', label: 'Signed up' },
  { key: 'active', label: 'Using it' },
];

export const REPLY_CATEGORIES = {
  '': { color: 'default', label: 'Unsorted' },
  interest: { color: 'green', label: 'Interested' },
  later: { color: 'blue', label: 'Later' },
  has_system: { color: 'purple', label: 'Has a system' },
  no: { color: 'default', label: 'Not interested' },
  unsubscribe: { color: 'orange', label: 'Unsubscribe' },
  auto: { color: 'default', label: 'Auto-reply' },
};

const rate = (n, of) => (of ? `${Math.round((n / of) * 1000) / 10}%` : '–');

function ReplyTag({ category }) {
  const t = useT();
  const c = REPLY_CATEGORIES[category || ''] || REPLY_CATEGORIES[''];
  return <Tag color={c.color} className="status-tag">{t(c.label)}</Tag>;
}

function FunnelBars({ totals }) {
  const t = useT();
  const top = totals.sent || 0;
  return (
    <div className="mfunnel__bars">
      {STAGES.map((s, i) => {
        const n = totals[s.key] || 0;
        const prev = i > 0 ? totals[STAGES[i - 1].key] || 0 : null;
        const width = top ? Math.max((n / top) * 100, n ? 0.6 : 0) : 0;
        return (
          <div key={s.key} className="mfunnel__row">
            <span className="mfunnel__label">{t(s.label)}</span>
            <Tooltip title={`${t(s.label)}: ${n} · ${rate(n, top)} ${t('of sent')}`}>
              <div className="mfunnel__track">
                <div className="mfunnel__fill" style={{ width: `${width}%` }} />
                <span className="mfunnel__n">{n.toLocaleString('sv-SE')}</span>
              </div>
            </Tooltip>
            <span className="mfunnel__pct">{i ? rate(n, top) : ''}</span>
            <span className="mfunnel__conv">{prev !== null ? `→ ${rate(n, prev)}` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

function ReplyNote({ value, onSave }) {
  const [v, setV] = useState(value || '');
  return (
    <Input
      size="small"
      variant="borderless"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== (value || '') && onSave(v)}
      onPressEnter={(e) => e.currentTarget.blur()}
      placeholder="Softone, nöjda"
    />
  );
}

export default function FunnelView({
  data, brand, onBrand, campaignIds, onCampaigns, editable = false, onReply, actions,
}) {
  const t = useT();
  const [section, setSection] = useState('campaigns');
  const replies = data.replies || [];
  const signups = data.signups || [];
  const brandOptions = [{ value: '', label: t('All') }, ...(data.brands || []).map((b) => ({ value: b, label: b }))];
  const campaignOptions = (data.campaigns || [])
    .filter((c) => !brand || c.brand === brand)
    .map((c) => ({ value: c._id, label: c.name }));

  const campaignColumns = [
    {
      title: t('Campaign'),
      key: 'name',
      fixed: 'left',
      width: 220,
      render: (_, r) => (<div><b>{r.name}</b><div className="mailer-muted">{r.listName || r.brand}</div></div>),
    },
    { title: t('Status'), dataIndex: 'status', width: 120, render: (v) => <CampaignStatusTag status={v} /> },
    { title: t('Start'), dataIndex: 'startedAt', width: 100, render: (v) => formatAdminDate(v) },
    { title: t('Sent'), dataIndex: 'sent', width: 80, align: 'right', sorter: (a, b) => a.sent - b.sent },
    { title: t('Opened'), key: 'opened', width: 90, align: 'right', sorter: (a, b) => a.opened / (a.delivered || 1) - b.opened / (b.delivered || 1), render: (_, r) => rate(r.opened, r.delivered) },
    { title: t('Clicked'), key: 'clicked', width: 80, align: 'right', render: (_, r) => rate(r.clicked, r.delivered) },
    { title: t('Replied'), dataIndex: 'replied', width: 80, align: 'right', sorter: (a, b) => a.replied - b.replied },
    { title: t('Interested'), dataIndex: 'interest', width: 90, align: 'right', sorter: (a, b) => a.interest - b.interest },
    { title: t('Signed up'), dataIndex: 'registered', width: 100, align: 'right', sorter: (a, b) => a.registered - b.registered },
    { title: t('Unsubscribed'), key: 'unsub', width: 110, align: 'right', render: (_, r) => rate(r.unsubscribed, r.delivered) },
  ];

  const replyColumns = [
    {
      title: t('Company'),
      key: 'company',
      width: 200,
      render: (_, r) => (<div><b>{r.company}</b>{r.email ? <div className="mailer-muted">{r.name ? `${r.name} · ` : ''}{r.email}</div> : null}</div>),
    },
    ...(editable ? [{ title: t('Reply'), dataIndex: 'snippet', width: 320, render: (v) => <span className="mfunnel__snippet">{v}</span> }] : []),
    {
      title: t('Category'),
      dataIndex: 'category',
      width: 160,
      render: (v, r) => (editable ? (
        <Select
          size="small"
          variant="borderless"
          value={v || ''}
          onChange={(category) => onReply(r._id, { category })}
          popupMatchSelectWidth={false}
          options={Object.entries(REPLY_CATEGORIES).map(([value]) => ({ value, label: <ReplyTag category={value} /> }))}
        />
      ) : <ReplyTag category={v} />),
    },
    {
      title: t('Note'),
      dataIndex: 'note',
      width: 220,
      render: (v, r) => (editable ? <ReplyNote value={v} onSave={(note) => onReply(r._id, { note })} /> : v),
    },
    { title: t('Campaign'), dataIndex: 'campaignName', width: 180 },
    { title: t('Date'), dataIndex: 'receivedAt', width: 100, render: (v) => formatAdminDate(v) },
  ];

  const signupColumns = [
    { title: t('Company'), dataIndex: 'company', width: 220, render: (v) => <b>{v}</b> },
    { title: t('Campaign'), dataIndex: 'campaignName', width: 200 },
    { title: t('Date'), dataIndex: 'createdAt', width: 110, render: (v) => formatAdminDate(v) },
    { title: t('Using it'), dataIndex: 'active', width: 100, render: (v) => (v ? t('Yes') : null) },
  ];

  return (
    <div className="mfunnel">
      <div className="mfunnel__toolbar">
        {brandOptions.length > 2 ? <Segmented value={brand || ''} onChange={onBrand} options={brandOptions} /> : null}
        {onCampaigns ? (
          <Select
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            className="mfunnel__campaigns"
            value={campaignIds}
            onChange={onCampaigns}
            options={campaignOptions}
            placeholder={t('All campaigns')}
            optionFilterProp="label"
          />
        ) : null}
        {actions ? <div className="mfunnel__actions">{actions}</div> : null}
      </div>

      <section className="mfunnel__card">
        <FunnelBars totals={data.totals || {}} />
      </section>

      <Segmented
        className="mfunnel__sections"
        value={section}
        onChange={setSection}
        options={[
          { value: 'campaigns', label: `${t('Campaigns')} ${(data.rows || []).length}` },
          { value: 'replies', label: `${t('Replies')} ${replies.length}` },
          { value: 'signups', label: `${t('Sign-ups')} ${signups.length}` },
        ]}
      />

      {section === 'campaigns' ? (
        <PlainTable rowKey="_id" size="middle" columns={campaignColumns} dataSource={data.rows || []} pagination={false} scroll={{ x: 1000 }} />
      ) : null}
      {section === 'replies' ? (
        <PlainTable rowKey="_id" size="middle" columns={replyColumns} dataSource={replies} pagination={{ pageSize: 50, hideOnSinglePage: true }} scroll={{ x: 900 }} />
      ) : null}
      {section === 'signups' ? (
        <PlainTable rowKey={(r, i) => `${r.company}-${i}`} size="middle" columns={signupColumns} dataSource={signups} pagination={false} scroll={{ x: 600 }} />
      ) : null}
    </div>
  );
}
