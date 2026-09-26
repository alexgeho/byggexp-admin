'use client';

import { Tag } from 'antd';
import {
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
  sending: { color: 'blue', label: 'Sending' },
  paused: { color: 'orange', label: 'Paused' },
  completed: { color: 'green', label: 'Completed' },
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
};

export function EventTag({ type }) {
  const t = useT();
  const s = EVENT_TYPES[type] || { color: 'default', label: type };
  return <Tag color={s.color}>{t(s.label)}</Tag>;
}

export const pct = (n, total) => (total ? `${Math.round((n / total) * 1000) / 10}%` : '–');
