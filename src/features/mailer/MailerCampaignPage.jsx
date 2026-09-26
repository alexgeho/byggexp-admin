'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, DatePicker, Input, Modal, Popconfirm, Progress, Select, Space, Spin,
} from 'antd';
import {
  ArrowLeftOutlined, CalendarOutlined, EditOutlined, PauseCircleOutlined, PlayCircleOutlined,
  SendOutlined, StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate, useParams } from '@/src/shared/routing/routerCompat';
import { useAuthStore } from '@/src/store/authStore';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { apiError, mailerApi } from './mailerApi';
import { CampaignStatusTag, pct } from './mailerUi';
import MailerEventsTable from './MailerEventsTable';
import { useCampaignOptions } from './MailerCampaignsPage';
import './mailer.scss';

function Stat({ label, value, sub }) {
  return (
    <div className="mailer-stat">
      <div className="mailer-stat__value">{value}</div>
      <div className="mailer-stat__label">{label}</div>
      {sub ? <div className="mailer-stat__sub">{sub}</div> : null}
    </div>
  );
}

export default function MailerCampaignPage() {
  const t = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const userEmail = useAuthStore((s) => s.user?.email || '');
  const [c, setC] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [when, setWhen] = useState(null);
  const { newsletterOptions, listOptions } = useCampaignOptions();

  const load = useCallback(() => mailerApi.campaign(id)
    .then((data) => {
      setC(data);
      setForm((f) => f ?? { name: data.name, subject: data.subject, newsletterId: data.newsletterId, listId: data.listId });
    })
    .catch(() => { appMessage.error(t('Campaign not found')); navigate('/admin/mailer/campaigns'); }), [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!c || !['sending', 'scheduled'].includes(c.status)) return undefined;
    const timer = setInterval(() => { if (!document.hidden) load(); }, 10000);
    return () => clearInterval(timer);
  }, [c, load]);

  if (!c || !form) return <div className="mailer-spin"><Spin /></div>;

  const editable = ['draft', 'scheduled', 'paused'].includes(c.status);
  const contentLocked = c.status === 'paused';
  const dirty = form.name !== c.name || form.subject !== c.subject
    || String(form.newsletterId || '') !== String(c.newsletterId || '') || String(form.listId || '') !== String(c.listId || '');

  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      if (dirty && editable) await mailerApi.updateCampaign(id, form);
      const next = await fn();
      if (next?._id) setC(next);
      else await load();
      if (okMsg) appMessage.success(okMsg);
      return true;
    } catch (err) {
      appMessage.error(apiError(err, t('Something went wrong')));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const s = c.stats || {};
  const done = (s.sent || 0) + (s.failed || 0);
  const ready = form.newsletterId && form.listId && form.subject?.trim();

  return (
    <div className="mailer-campaign">
      <div className="mailer-campaign__bar">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/mailer/campaigns')} />
        <h2>{c.name}</h2>
        <CampaignStatusTag status={c.status} />
        <div className="mailer-campaign__actions">
          <Button icon={<SendOutlined />} onClick={() => { setTestTo(userEmail); setTestOpen(true); }}>{t('Send test')}</Button>
          {['draft', 'scheduled'].includes(c.status) ? (
            <>
              <Button icon={<CalendarOutlined />} disabled={!ready} onClick={() => { setWhen(c.scheduledAt ? dayjs(c.scheduledAt) : dayjs().add(1, 'day').hour(8).minute(0)); setScheduleOpen(true); }}>
                {t('Schedule')}
              </Button>
              <Popconfirm
                title={t('Send the campaign now?')}
                description={t('It goes out gradually at the rate set under Settings.')}
                okText={t('Send now')}
                cancelText={t('Cancel')}
                onConfirm={() => act(() => mailerApi.startCampaign(id), t('Sending started'))}
                disabled={!ready}
              >
                <Button type="primary" icon={<PlayCircleOutlined />} disabled={!ready} loading={busy}>{t('Send now')}</Button>
              </Popconfirm>
            </>
          ) : null}
          {c.status === 'sending' ? (
            <Button icon={<PauseCircleOutlined />} onClick={() => act(() => mailerApi.pauseCampaign(id))} loading={busy}>{t('Pause')}</Button>
          ) : null}
          {c.status === 'paused' ? (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => act(() => mailerApi.resumeCampaign(id), t('Sending resumed'))} loading={busy}>{t('Resume')}</Button>
          ) : null}
          {['sending', 'paused', 'scheduled'].includes(c.status) ? (
            <Popconfirm title={t('Stop the campaign for good? Remaining recipients will not get it.')} okText={t('Stop')} cancelText={t('Cancel')} onConfirm={() => act(() => mailerApi.cancelCampaign(id))}>
              <Button danger icon={<StopOutlined />}>{t('Stop')}</Button>
            </Popconfirm>
          ) : null}
        </div>
      </div>

      {c.lastError ? <Alert type="warning" showIcon message={c.lastError} className="mailer-campaign__alert" /> : null}
      {c.status === 'scheduled' ? (
        <Alert type="info" showIcon message={t('Scheduled for {x}').replace('{x}', formatAdminDateTime(c.scheduledAt))} className="mailer-campaign__alert" />
      ) : null}

      {c.stats?.total ? (
        <div className="mailer-card">
          <Progress percent={Math.round((done / s.total) * 100)} format={() => `${s.sent}/${s.total}`} status={c.status === 'sending' ? 'active' : undefined} />
          <div className="mailer-stats">
            <Stat label={t('Recipients')} value={s.total} />
            <Stat label={t('Sent')} value={s.sent} />
            <Stat label={t('Opened')} value={pct(s.opened, s.sent)} sub={s.opened} />
            <Stat label={t('Clicked')} value={pct(s.clicked, s.sent)} sub={s.clicked} />
            <Stat label={t('Unsubscribed')} value={s.unsubscribed} />
            <Stat label={t('Bounced')} value={s.bounced} sub={s.failed > s.bounced ? `${t('Failed')}: ${s.failed - s.bounced}` : null} />
          </div>
        </div>
      ) : null}

      <div className="mailer-card mailer-form mailer-form--grid">
        <label>
          <span>{t('Name (only shown internally)')}</span>
          <Input value={form.name} disabled={!editable} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </label>
        <label>
          <span>{t('Subject line')}</span>
          <Input value={form.subject} disabled={!editable} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} maxLength={300} />
          <span className="mailer-muted">{t('Tip: {{namn}} and {{företag}} are replaced with the recipient\'s name and company.')}</span>
        </label>
        <label>
          <span>{t('Newsletter (design)')}</span>
          <Space.Compact style={{ width: '100%' }}>
            <Select style={{ flex: 1 }} value={form.newsletterId} disabled={!editable || contentLocked} options={newsletterOptions} onChange={(v) => setForm((f) => ({ ...f, newsletterId: v }))} placeholder={t('Choose a design')} />
            {form.newsletterId ? <Button icon={<EditOutlined />} onClick={() => navigate(`/admin/newsletters/${form.newsletterId}`)}>{t('Edit design')}</Button> : null}
          </Space.Compact>
        </label>
        <label>
          <span>{t('Subscriber list')}</span>
          <Select value={form.listId} disabled={!editable || contentLocked} options={listOptions} onChange={(v) => setForm((f) => ({ ...f, listId: v }))} placeholder={t('Choose a list')} />
        </label>
        {editable && dirty ? (
          <div>
            <Button type="primary" loading={busy} onClick={() => act(() => mailerApi.updateCampaign(id, form), t('Saved'))}>{t('Save changes')}</Button>
          </div>
        ) : null}
      </div>

      {c.status !== 'draft' ? (
        <div className="mailer-card">
          <h3 className="mailer-h3">{t('Activity')}</h3>
          <MailerEventsTable campaignId={id} refreshMs={10000} showCampaign={false} />
        </div>
      ) : null}

      <Modal
        open={testOpen}
        title={t('Send test email')}
        okText={t('Send')}
        cancelText={t('Cancel')}
        confirmLoading={busy}
        onOk={async () => { if (await act(() => mailerApi.testCampaign(id, testTo.trim()), t('Test email sent to {x}').replace('{x}', testTo))) setTestOpen(false); }}
        onCancel={() => setTestOpen(false)}
      >
        <div className="mailer-form">
          <label><span>{t('Recipient')}</span><Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} /></label>
          <span className="mailer-muted">{t('Sent through the mailer SMTP with [TEST] in the subject. Name and company tags are filled with test values.')}</span>
        </div>
      </Modal>

      <Modal
        open={scheduleOpen}
        title={t('Schedule campaign')}
        okText={t('Schedule')}
        cancelText={t('Cancel')}
        confirmLoading={busy}
        onOk={async () => { if (await act(() => mailerApi.startCampaign(id, when?.toISOString()), t('Campaign scheduled'))) setScheduleOpen(false); }}
        onCancel={() => setScheduleOpen(false)}
      >
        <DatePicker showTime={{ format: 'HH:mm', minuteStep: 5 }} format="YYYY-MM-DD HH:mm" value={when} onChange={setWhen} disabledDate={(d) => d && d < dayjs().startOf('day')} style={{ width: '100%' }} />
        <p className="mailer-muted" style={{ marginTop: 8 }}>{t('Recipients are picked when sending starts, so addresses imported before then are included.')}</p>
      </Modal>
    </div>
  );
}
