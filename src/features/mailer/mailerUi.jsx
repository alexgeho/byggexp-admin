'use client';

import { Select, Tag, Tooltip } from 'antd';
import {
  EyeInvisibleOutlined, EyeOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import { useT } from '@/src/i18n/LanguageProvider';

// Shared status chips for the mailer pages (same look as Inleed's Ja / Aktiv / Studs).

const SUBSCRIBER = {
  active: { color: 'green', icon: <CheckCircleOutlined />, label: 'Active' },
  unsubscribed: { color: 'default', icon: <MinusCircleOutlined />, label: 'Unsubscribed' },
  bounced: { color: 'red', icon: <CloseCircleOutlined />, label: 'Bounced' },
  complained: { color: 'red', icon: <ExclamationCircleOutlined />, label: 'Spam complaint' },
};

export function SubscriberStatusTag({ status }) {
  const t = useT();
  const s = SUBSCRIBER[status] || SUBSCRIBER.active;
  return <Tag color={s.color} icon={s.icon}>{t(s.label)}</Tag>;
}

export function VerifiedTag({ value }) {
  const t = useT();
  if (value === 'valid') return <Tag color="green" icon={<CheckCircleOutlined />}>{t('Yes')}</Tag>;
  if (value === 'invalid') return <Tag color="red" icon={<CloseCircleOutlined />}>{t('No')}</Tag>;
  return <Tag>{t('Not checked')}</Tag>;
}

export const CAMPAIGN_STATUS = {
  draft: { color: 'default', label: 'Draft' },
  scheduled: { color: 'purple', label: 'Scheduled' },
  sending: { color: 'green', label: 'Sending' },
  paused: { color: 'orange', label: 'Paused' },
  completed: { color: 'blue', label: 'Completed' },
  cancelled: { color: 'default', label: 'Cancelled' },
};

export function CampaignStatusTag({ status }) {
  const t = useT();
  const s = CAMPAIGN_STATUS[status] || CAMPAIGN_STATUS.draft;
  return <Tag color={s.color}>{t(s.label)}</Tag>;
}

export const EVENT_TYPES = {
  sent: { color: 'blue', label: 'Email sent' },
  open: { color: 'green', label: 'Opened the email' },
  click: { color: 'cyan', label: 'Clicked a link' },
  unsubscribe: { color: 'orange', label: 'Unsubscribed' },
  bounce: { color: 'red', label: 'Bounced' },
  failed: { color: 'red', label: 'Failed' },
  test: { color: 'purple', label: 'Test email' },
};

export function EventTag({ type }) {
  const t = useT();
  const s = EVENT_TYPES[type] || { color: 'default', label: type };
  return <Tag color={s.color}>{t(s.label)}</Tag>;
}

export const pct = (n, total) => (total ? `${Math.round((n / total) * 1000) / 10}%` : '–');

// Company («firm») filter of the Nyhetsbrev pages (owner 21.11 Kampanjer,
// 25.11 Tratt): ONE dropdown «Alla företag» on every page, the choice is
// remembered (same key on all pages). With `onHide` every row gets an eye:
// a hidden firm moves to the bottom, greyed, and is left out of «Alla».
export const FIRM_KEY = 'byggexp.mailer.campaigns.firm';

export function readFirm() {
  try { return localStorage.getItem(FIRM_KEY) || undefined; } catch { return undefined; }
}

export function saveFirm(v) {
  try { if (v) localStorage.setItem(FIRM_KEY, v); else localStorage.removeItem(FIRM_KEY); } catch { /* storage unavailable */ }
}

export function FirmSelect({ value, onChange, options, hidden = [], onHide }) {
  const t = useT();
  const eye = (firm, isHidden) => (
    <Tooltip title={t(isHidden ? 'Show company' : 'Hide company')}>
      <button
        type="button"
        className="mailer-firm__eye"
        aria-label={t(isHidden ? 'Show company' : 'Hide company')}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onClick={(e) => { e.stopPropagation(); onHide(firm, !isHidden); }}
      >
        {isHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
      </button>
    </Tooltip>
  );
  const row = (o, isHidden) => ({
    value: o.value,
    disabled: isHidden,
    label: o.label,
    title: o.value,
    render: onHide ? (
      <span className={`mailer-firm__row${isHidden ? ' is-hidden' : ''}`}>
        <span>{o.label}</span>
        {eye(o.value, isHidden)}
      </span>
    ) : o.label,
  });
  const all = [
    ...options.filter((o) => !hidden.includes(o.value)).map((o) => row(o, false)),
    ...hidden.map((h) => row({ value: h, label: h }, true)),
  ];
  return (
    <Select
      allowClear
      placeholder={t('All companies')}
      value={value}
      onChange={onChange}
      options={all}
      optionRender={(o) => o.data.render}
      labelRender={(o) => o.label}
      className="mailer-firm"
      popupMatchSelectWidth={false}
    />
  );
}

// ONE filter row for every Nyhetsbrev page (owner 26.11, «no jumps»): the firm
// dropdown is always first, always the same width, at the same place on top of
// the page; page filters follow it, page buttons sit at the right edge.
// Every control in the row is 40px.
export function MailerToolbar({ firm, children, actions }) {
  return (
    <div className="mailer-bar">
      <FirmSelect {...firm} />
      {children}
      {actions ? <div className="mailer-bar__actions">{actions}</div> : null}
    </div>
  );
}
