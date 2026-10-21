'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { DatePicker, Input, Segmented, Select, Tag, Tooltip } from 'antd';
import { DownOutlined, EditOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import { IconButton } from '@/src/ui-kit';
import { PlainTable } from '@/src/shared/components/DataTable';
import { orDash } from '@/src/shared/components/EmptyCell';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { useT } from '@/src/i18n/LanguageProvider';
import { CampaignStatusTag } from './mailerUi';
import FunnelRecipients from './FunnelRecipients';
import './mailer.scss';
import './funnel.scss';

// Cold-mail funnel shared by the admin page and the public share link:
// stage bars, campaign comparison, replies and sign-ups. `editable` lets the
// admin classify replies; the public view is read-only.

// One colour per phase: delivery → engagement → dialogue → conversion.
export const STAGES = [
  { key: 'sent', label: 'Sent', color: '#2394ff' },
  { key: 'delivered', label: 'Delivered', color: '#2394ff' },
  { key: 'opened', label: 'Opened', color: '#7c5cfc' },
  { key: 'clicked', label: 'Clicked', color: '#7c5cfc' },
  { key: 'replied', label: 'Replied', color: '#f59e0b' },
  { key: 'interest', label: 'Interested', color: '#f59e0b' },
  { key: 'demo', label: 'Demo', color: '#45b36b' },
  { key: 'registered', label: 'Signed up', color: '#45b36b' },
  { key: 'active', label: 'Using it', color: '#45b36b' },
];

// `fill` = segment colour in the reply-mix bar (same hue as the tag).
export const REPLY_CATEGORIES = {
  interest: { color: 'green', fill: '#45b36b', label: 'Interested' },
  later: { color: 'blue', fill: '#2394ff', label: 'Later' },
  has_system: { color: 'purple', fill: '#7c5cfc', label: 'Other service' },
  no: { color: 'default', fill: '#94a3b8', label: 'Just no' },
  unsubscribe: { color: 'orange', fill: '#f97316', label: 'Unsubscribe' },
  '': { color: 'default', fill: '#e2e8f0', label: 'Unsorted' },
  auto: { color: 'default', fill: '#e2e8f0', label: 'Auto-reply' },
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
                <div className="mfunnel__fill" style={{ width: `${width}%`, background: s.color }} />
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

function ReplyMix({ mix }) {
  const t = useT();
  const parts = Object.entries(REPLY_CATEGORIES)
    .filter(([k]) => k !== 'auto' && mix[k])
    .map(([k, c]) => ({ key: k, ...c, n: mix[k] }));
  const total = parts.reduce((sum, p) => sum + p.n, 0);
  if (!total) return null;
  return (
    <div className="mfunnel__mix">
      <div className="mfunnel__mix-bar">
        {parts.map((p) => (
          <Tooltip key={p.key} title={`${t(p.label)}: ${p.n}`}>
            <div className="mfunnel__mix-seg" style={{ flexGrow: p.n, background: p.fill }} />
          </Tooltip>
        ))}
      </div>
      <div className="mfunnel__legend">
        {parts.map((p) => (
          <span key={p.key} className="mfunnel__legend-item">
            <i style={{ background: p.fill }} />
            {t(p.label)}
            <b>{p.n}</b>
            <span>{rate(p.n, total)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const INSIGHTS_OPEN_KEY = 'byggexp.mfunnel.insights.open';
const readOpen = () => { try { return localStorage.getItem(INSIGHTS_OPEN_KEY) !== '0'; } catch { return true; } };

function Insights({ items, at, onRefresh, refreshing }) {
  const t = useT();
  const [open, setOpen] = useState(readOpen);
  if (!items?.length && !onRefresh) return null;
  const toggle = () => setOpen((o) => {
    try { localStorage.setItem(INSIGHTS_OPEN_KEY, o ? '0' : '1'); } catch { /* storage blocked */ }
    return !o;
  });
  return (
    <section className="mfunnel__card mfunnel__insights">
      <div className="mfunnel__insights-head">
        <button type="button" className="mfunnel__insights-toggle" onClick={toggle} aria-expanded={open}>
          {open ? <DownOutlined /> : <RightOutlined />}
          <h3>{t('Conclusions')}</h3>
        </button>
        {at ? <span className="mailer-muted">{formatAdminDate(at)}</span> : null}
        {onRefresh ? (
          <IconButton size="sm" variant="ghost" title={t('Update')} aria-label={t('Update')} onClick={onRefresh} disabled={refreshing}>
            <ReloadOutlined spin={refreshing} />
          </IconButton>
        ) : null}
      </div>
      {open && items?.length ? (
        <ol>{items.map((x) => <li key={x}>{x}</li>)}</ol>
      ) : null}
    </section>
  );
}

function Competitors({ list }) {
  const t = useT();
  if (!list?.length) return null;
  return (
    <div className="mfunnel__competitors">
      <span className="mfunnel__competitors-title">{t('Competitors')}</span>
      {list.map((c) => (
        <span key={c.name} className="mfunnel__chip">
          {c.name} <b>{c.n}</b>
          {c.saving5 > 0 ? <span className="mfunnel__saving">−{c.saving5.toLocaleString('sv-SE')} kr/mån</span> : null}
        </span>
      ))}
    </div>
  );
}

// Every demo request from the site, mail or not — kept apart from the funnel.
function SiteDemos({ n }) {
  const t = useT();
  return (
    <div className="mfunnel__competitors">
      <span className="mfunnel__competitors-title">{t('Demo requests')}</span>
      <span className="mfunnel__chip">{t('All')} <b>{n}</b></span>
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

// `period` = [from, to] as YYYY-MM-DD strings (or null = all time).
function PeriodPicker({ period, onPeriod }) {
  const t = useT();
  const today = dayjs();
  const presets = [
    { label: t('This week'), value: [today.startOf('week'), today] },
    { label: t('Last week'), value: [today.subtract(1, 'week').startOf('week'), today.subtract(1, 'week').endOf('week')] },
    { label: t('Last 30 days'), value: [today.subtract(29, 'day'), today] },
    { label: t('This month'), value: [today.startOf('month'), today] },
  ];
  return (
    <DatePicker.RangePicker
      className="mfunnel__period"
      value={period ? [dayjs(period[0]), dayjs(period[1])] : null}
      onChange={(v) => onPeriod(v ? [v[0].format('YYYY-MM-DD'), v[1].format('YYYY-MM-DD')] : null)}
      presets={presets}
      format="D MMM"
      allowEmpty={[false, false]}
    />
  );
}

export default function FunnelView({
  data, brand, onBrand, campaignIds, onCampaigns, period, onPeriod, editable = false, onReply, onDraft,
  onInsights, insightsLoading, actions, recipients, recipientsQuery, onRecipientsQuery,
}) {
  const t = useT();
  const [section, setSection] = useState('campaigns');
  const replies = data.replies || [];
  const signups = data.signups || [];
  const demos = data.demos || [];
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
    ...(data.visits != null ? [
      { title: t('Site visits'), dataIndex: 'visits', width: 90, align: 'right', sorter: (a, b) => (a.visits || 0) - (b.visits || 0) },
      { title: t('Time on site'), dataIndex: 'avgSeconds', width: 110, align: 'right', render: (v) => (v ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` : null) },
    ] : []),
    { title: t('Replied'), dataIndex: 'replied', width: 80, align: 'right', sorter: (a, b) => a.replied - b.replied },
    { title: t('Interested'), dataIndex: 'interest', width: 90, align: 'right', sorter: (a, b) => a.interest - b.interest },
    { title: t('Demo'), dataIndex: 'demo', width: 80, align: 'right', sorter: (a, b) => (a.demo || 0) - (b.demo || 0) },
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
      width: 200,
      render: (v, r) => (editable ? (
        <Select
          size="small"
          variant="borderless"
          style={{ maxWidth: '100%' }}
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
    { title: t('Competitor'), dataIndex: 'competitor', width: 130 },
    { title: t('Campaign'), dataIndex: 'campaignName', width: 180 },
    { title: t('Date'), dataIndex: 'receivedAt', width: 100, render: (v) => formatAdminDate(v) },
    ...(onDraft ? [{
      key: 'draft',
      width: 56,
      fixed: 'right',
      render: (_, r) => (['auto', 'unsubscribe'].includes(r.category) ? null : (
        <IconButton size="sm" variant="ghost" title={t('Reply draft')} aria-label={t('Reply draft')} onClick={() => onDraft(r)}>
          <EditOutlined />
        </IconButton>
      )),
    }] : []),
  ];

  const demoColumns = [
    {
      title: t('Name'),
      key: 'name',
      width: 220,
      render: (_, r) => (<div><b>{r.name}</b>{r.email || r.phone ? <div className="mailer-muted">{[r.email, r.phone].filter((v) => v && v !== 'Ej angivet').join(' · ')}</div> : null}</div>),
    },
    { title: t('Campaign'), dataIndex: 'campaignName', width: 200 },
    { title: t('Source'), dataIndex: 'channel', width: 220, render: (v) => orDash(v && v.replace(/^direct/, t('Direct'))) },
    { title: t('Date'), dataIndex: 'createdAt', width: 110, render: (v) => formatAdminDate(v) },
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
        {onPeriod ? <PeriodPicker period={period} onPeriod={onPeriod} /> : null}
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
        <ReplyMix mix={data.replyMix || {}} />
        <Competitors list={data.competitors} />
        <SiteDemos n={demos.length} />
      </section>

      <Insights items={data.insights} at={data.insightsAt} onRefresh={onInsights} refreshing={insightsLoading} />

      <Segmented
        className="mfunnel__sections"
        value={section}
        onChange={setSection}
        options={[
          { value: 'campaigns', label: `${t('Campaigns')} ${(data.rows || []).length}` },
          ...(onRecipientsQuery ? [{
            value: 'recipients',
            label: `${t('Recipients')} ${Object.values(recipients?.counts || {}).reduce((a, b) => a + b, 0)}`,
          }] : []),
          { value: 'replies', label: `${t('Replies')} ${replies.length}` },
          { value: 'demos', label: `${t('Demo')} ${demos.length}` },
          { value: 'signups', label: `${t('Sign-ups')} ${signups.length}` },
        ]}
      />

      {section === 'campaigns' ? (
        <PlainTable rowKey="_id" size="middle" columns={campaignColumns} dataSource={data.rows || []} pagination={false} scroll={{ x: 1000 }} />
      ) : null}
      {section === 'recipients' ? (
        <FunnelRecipients data={recipients} query={recipientsQuery} onQuery={onRecipientsQuery} />
      ) : null}
      {section === 'replies' ? (
        <PlainTable rowKey="_id" size="middle" columns={replyColumns} dataSource={replies} pagination={{ pageSize: 50, hideOnSinglePage: true }} scroll={{ x: 900 }} />
      ) : null}
      {section === 'demos' ? (
        <PlainTable rowKey={(r, i) => `${r.name}-${i}`} size="middle" columns={demoColumns} dataSource={demos} pagination={false} scroll={{ x: 600 }} />
      ) : null}
      {section === 'signups' ? (
        <PlainTable rowKey={(r, i) => `${r.company}-${i}`} size="middle" columns={signupColumns} dataSource={signups} pagination={false} scroll={{ x: 600 }} />
      ) : null}
    </div>
  );
}
