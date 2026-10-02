'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Input, InputNumber, Modal, Popconfirm, Select, Spin, Switch, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { apiError, mailerApi } from './mailerApi';
import './mailer.scss';

export default function MailerSettingsPage() {
  const t = useT();
  const [s, setS] = useState(null);
  const [pass, setPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  // Sender profiles: each campaign picks one (e.g. ByggExp, or a separate outreach domain).
  const [senders, setSenders] = useState([]);
  const [senderKey, setSenderKey] = useState('main');
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [dns, setDns] = useState(null);
  const [dnsLoading, setDnsLoading] = useState(false);

  const loadSenders = () => mailerApi.senders().then(setSenders).catch(() => {});
  useEffect(() => { loadSenders(); }, []);
  useEffect(() => {
    setS(null);
    setPass('');
    mailerApi.settings(senderKey).then(setS).catch((err) => appMessage.error(apiError(err, t('Could not load settings'))));
    setDns(null);
  }, [senderKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkDns = async () => {
    setDnsLoading(true);
    try {
      setDns(await mailerApi.dnsCheck(senderKey));
    } catch (err) {
      appMessage.error(apiError(err, t('Something went wrong')));
    } finally {
      setDnsLoading(false);
    }
  };
  useEffect(() => { if (s?.fromEmail) checkDns(); }, [s?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const addSender = async () => {
    try {
      const created = await mailerApi.createSender(newLabel);
      await loadSenders();
      setSenderKey(created.key);
      setAddOpen(false);
      setNewLabel('');
    } catch (err) {
      appMessage.error(apiError(err, t('Could not save')));
    }
  };

  const removeSender = async () => {
    try {
      await mailerApi.deleteSender(senderKey);
      await loadSenders();
      setSenderKey('main');
    } catch (err) {
      appMessage.error(apiError(err, t('Could not save')));
    }
  };

  const senderBar = (
    <div className="mailer-card mailer-form">
      <h3 className="mailer-h3">{t('Sender profile')}</h3>
      <div className="mailer-picker">
        <Select
          className="mailer-picker__select"
          value={senderKey}
          onChange={setSenderKey}
          options={senders.map((x) => ({ value: x.key, label: x.fromEmail ? `${x.label} — ${x.fromEmail}` : x.label }))}
        />
        <Button icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>{t('Add sender')}</Button>
        {senderKey !== 'main' ? (
          <Popconfirm title={t('Delete this sender?')} okText={t('Delete')} cancelText={t('Cancel')} onConfirm={removeSender}>
            <Button danger icon={<DeleteOutlined />} title={t('Delete')} />
          </Popconfirm>
        ) : null}
      </div>
      <span className="mailer-muted">{t('Each campaign chooses which sender it goes out from. Settings below apply to the selected sender.')}</span>
      <Modal open={addOpen} title={t('Add sender')} okText={t('Save')} cancelText={t('Cancel')} onOk={addSender} onCancel={() => setAddOpen(false)} okButtonProps={{ disabled: !newLabel.trim() }}>
        <Input autoFocus value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Nordkod" onPressEnter={() => newLabel.trim() && addSender()} />
      </Modal>
    </div>
  );

  if (!s) return <div className="mailer-settings">{senderBar}<div className="mailer-spin"><Spin /></div></div>;
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const next = await mailerApi.saveSettings({ ...s, smtpPass: pass || undefined }, senderKey);
      setS(next);
      setPass('');
      loadSenders();
      appMessage.success(t('Saved'));
      return true;
    } catch (err) {
      appMessage.error(apiError(err, t('Could not save')));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      if (await save()) {
        await mailerApi.verifySmtp(senderKey);
        appMessage.success(t('Connection OK — the SMTP server accepted the login'));
      }
    } catch (err) {
      appMessage.error(apiError(err, t('Connection failed')));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mailer-settings">
      {senderBar}
      {!s.configured ? (
        <Alert
          type="warning"
          showIcon
          message={t('Enter an SMTP account before sending campaigns')}
          description={t('Use a separate sender address for newsletters (e.g. a mailbox on a separate domain), not the one used for invoices and login codes — then a spam complaint on a campaign cannot affect the product\'s own mail.')}
        />
      ) : (
        <Alert type="success" showIcon icon={<CheckCircleOutlined />} message={t('SMTP is configured')} />
      )}

      <div className="mailer-card mailer-form">
        <h3 className="mailer-h3">SMTP</h3>
        <div className="mailer-form__row">
          <label style={{ flex: 3 }}><span>{t('Server')}</span><Input value={s.smtpHost} onChange={(e) => set('smtpHost', e.target.value)} placeholder="mail.dindoman.se" /></label>
          <label style={{ flex: 1 }}><span>{t('Port')}</span><InputNumber value={s.smtpPort} onChange={(v) => set('smtpPort', v)} min={1} max={65535} style={{ width: '100%' }} /></label>
        </div>
        <label><span>{t('Username')}</span><Input value={s.smtpUser} onChange={(e) => set('smtpUser', e.target.value)} placeholder="nyhetsbrev@dindoman.se" autoComplete="off" /></label>
        <label>
          <span>{t('Password')}</span>
          <Input.Password value={pass} onChange={(e) => setPass(e.target.value)} placeholder={s.hasPassword ? t('•••••• saved — leave empty to keep') : ''} autoComplete="new-password" />
          <span className="mailer-muted">{t('Stored encrypted and never shown again.')}</span>
        </label>
        {[110, 143, 993, 995].includes(Number(s.smtpPort)) ? (
          <Alert type="error" showIcon message={t('Port {x} is for receiving mail (IMAP/POP). For sending use 465 (SSL) or 587.').replace('{x}', s.smtpPort)} />
        ) : null}
        <span className="mailer-muted">{t('Port 587 = STARTTLS (most common), 465 = SSL.')}</span>
      </div>

      <div className="mailer-card mailer-form">
        <h3 className="mailer-h3">{t('Sender')}</h3>
        <label><span>{t('Name in the admin')}</span><Input value={s.label} onChange={(e) => set('label', e.target.value)} placeholder="ByggExp" /></label>
        <div className="mailer-form__row">
          <label><span>{t('Sender name')}</span><Input value={s.fromName} onChange={(e) => set('fromName', e.target.value)} placeholder="ByggExp" /></label>
          <label><span>{t('Sender address')}</span><Input value={s.fromEmail} onChange={(e) => set('fromEmail', e.target.value)} placeholder="nyhetsbrev@dindoman.se" /></label>
        </div>
        <label>
          <span>{t('Reply-to (optional)')}</span>
          <Input value={s.replyTo} onChange={(e) => set('replyTo', e.target.value)} placeholder="alexander@byggexp.se" />
          <span className="mailer-muted">{t('Where replies go. The sender address should belong to the SMTP account above.')}</span>
        </label>
      </div>

      <div className="mailer-card mailer-form">
        <h3 className="mailer-h3">{t('Sending')}</h3>
        <label>
          <span>{t('Max emails per hour')}</span>
          <InputNumber value={s.ratePerHour} onChange={(v) => set('ratePerHour', v)} min={10} max={3000} step={10} style={{ width: 160 }} />
          <span className="mailer-muted">{t('Start low (50–100/h) on a new domain and raise it gradually. Also check your mail host\'s own sending limit.')}</span>
        </label>
        <label className="mailer-form__switch"><Switch checked={s.trackOpens} onChange={(v) => set('trackOpens', v)} /><span>{t('Track opens (invisible image)')}</span></label>
        <label className="mailer-form__switch"><Switch checked={s.trackClicks} onChange={(v) => set('trackClicks', v)} /><span>{t('Track link clicks')}</span></label>
        <label>
          <span>{t('Pause a campaign when hard bounces exceed (%)')}</span>
          <InputNumber value={s.maxBounceRatePct} onChange={(v) => set('maxBounceRatePct', v)} min={1} max={50} style={{ width: 160 }} />
          <span className="mailer-muted">{t('Checked after the first 20 mails. Over ~5 % means the list needs cleaning.')}</span>
        </label>
      </div>

      <div className="mailer-card mailer-form">
        <h3 className="mailer-h3">{t('Warm-up')}</h3>
        <label className="mailer-form__switch"><Switch checked={s.warmupEnabled} onChange={(v) => set('warmupEnabled', v)} /><span>{t('Warm up this sender (daily limit that grows every day)')}</span></label>
        <span className="mailer-muted">{t('A new domain must build a reputation: start with a few dozen mails a day and grow 20–30 % a day for 2–4 weeks. Mails are spread over the day, not sent all at once.')}</span>
        {s.warmupEnabled ? (
          <>
            <div className="mailer-form__row">
              <label><span>{t('Start (mails/day)')}</span><InputNumber value={s.warmupStartPerDay} onChange={(v) => set('warmupStartPerDay', v)} min={1} max={1000} style={{ width: '100%' }} /></label>
              <label><span>{t('Growth per day (%)')}</span><InputNumber value={s.warmupGrowthPct} onChange={(v) => set('warmupGrowthPct', v)} min={1} max={100} style={{ width: '100%' }} /></label>
              <label><span>{t('Target (mails/day)')}</span><InputNumber value={s.warmupTargetPerDay} onChange={(v) => set('warmupTargetPerDay', v)} min={1} max={20000} style={{ width: '100%' }} /></label>
            </div>
            {s.status ? (
              <div className="mailer-stats">
                <div className="mailer-stat"><div className="mailer-stat__value">{s.status.warmupDay ?? '—'}</div><div className="mailer-stat__label">{t('Warm-up day')}</div></div>
                <div className="mailer-stat"><div className="mailer-stat__value">{s.status.sentToday} / {s.status.todayCap ?? '∞'}</div><div className="mailer-stat__label">{t('Sent today / limit')}</div></div>
                <div className="mailer-stat"><div className="mailer-stat__value">{s.status.daysToTarget}</div><div className="mailer-stat__label">{t('Days to target')}</div></div>
              </div>
            ) : null}
            {s.status?.schedule ? (
              <div className="mailer-warmup-plan">
                {s.status.schedule.slice(0, 21).map((n, i) => (
                  <span key={i} className={i + 1 === s.status.warmupDay ? 'is-today' : ''} title={`${t('Day')} ${i + 1}`}>{n}</span>
                ))}
              </div>
            ) : null}
            <span className="mailer-muted">{t('Plan for the first 3 weeks (mails per day). Changes apply after Save.')}</span>
            <div><Button size="small" onClick={() => set('warmupRestart', true)} disabled={s.warmupRestart}>{s.warmupRestart ? t('Restarts from day 1 on Save') : t('Restart warm-up from day 1')}</Button></div>
          </>
        ) : null}
      </div>

      <div className="mailer-card mailer-form">
        <h3 className="mailer-h3">{t('Send window')}</h3>
        <label className="mailer-form__switch"><Switch checked={s.sendWindowEnabled} onChange={(v) => set('sendWindowEnabled', v)} /><span>{t('Only send during office hours (Swedish time)')}</span></label>
        {s.sendWindowEnabled ? (
          <>
            <div className="mailer-form__row">
              <label><span>{t('From (hour)')}</span><InputNumber value={s.sendHourFrom} onChange={(v) => set('sendHourFrom', v)} min={0} max={23} style={{ width: '100%' }} /></label>
              <label><span>{t('To (hour)')}</span><InputNumber value={s.sendHourTo} onChange={(v) => set('sendHourTo', v)} min={1} max={24} style={{ width: '100%' }} /></label>
            </div>
            <label className="mailer-form__switch"><Switch checked={s.weekdaysOnly} onChange={(v) => set('weekdaysOnly', v)} /><span>{t('Weekdays only')}</span></label>
            {s.status ? <span className="mailer-muted">{s.status.inWindow ? t('Sending is open right now.') : t('Outside the window now — campaigns wait and continue automatically.')}</span> : null}
          </>
        ) : null}
      </div>

      <div className="mailer-card">
        <h3 className="mailer-h3">{t('Domain check (DNS)')}{dns?.domain ? ` — ${dns.domain}` : ''}</h3>
        {dns?.checks?.length ? (
          <ul className="mailer-dns">
            {dns.checks.map((c) => (
              <li key={c.name}>
                <Tag color={c.ok ? 'success' : 'error'} icon={c.ok ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>{c.name}</Tag>
                <span className="mailer-muted">{c.ok ? c.value : t('Missing — add it in the domain\'s DNS')}</span>
              </li>
            ))}
          </ul>
        ) : <span className="mailer-muted">{s.fromEmail ? t('Checking…') : t('Enter a sender address first.')}</span>}
        <div style={{ marginTop: 8 }}><Button size="small" icon={<ReloadOutlined />} loading={dnsLoading} onClick={checkDns} disabled={!s.fromEmail}>{t('Check again')}</Button></div>
      </div>

      <div className="mailer-card">
        <h3 className="mailer-h3">{t('Deliverability checklist')}</h3>
        <ul className="mailer-checklist">
          <li>{t('SPF, DKIM and DMARC records for the sender domain (set in the domain\'s DNS).')}</li>
          <li>{t('Every mail has a one-click unsubscribe link and header — added automatically.')}</li>
          <li>{t('Unsubscribes and hard bounces are never mailed again — handled automatically.')}</li>
          <li>{t('The footer of each design has the company address and org. no.')}</li>
          <li>{t('Send to business addresses (B2B); private persons need prior consent.')}</li>
        </ul>
      </div>

      <div className="mailer-settings__actions">
        <Button type="primary" icon={<SaveOutlined />} loading={saving && !testing} onClick={save}>{t('Save')}</Button>
        <Button loading={testing} onClick={test}>{t('Save and test connection')}</Button>
      </div>
    </div>
  );
}
