'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Input, InputNumber, Spin, Switch } from 'antd';
import { CheckCircleOutlined, SaveOutlined } from '@ant-design/icons';
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

  useEffect(() => {
    mailerApi.settings().then(setS).catch((err) => appMessage.error(apiError(err, t('Could not load settings'))));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return <div className="mailer-spin"><Spin /></div>;
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const next = await mailerApi.saveSettings({ ...s, smtpPass: pass || undefined });
      setS(next);
      setPass('');
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
        await mailerApi.verifySmtp();
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
        <span className="mailer-muted">{t('Port 587 = STARTTLS (most common), 465 = SSL.')}</span>
      </div>

      <div className="mailer-card mailer-form">
        <h3 className="mailer-h3">{t('Sender')}</h3>
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
