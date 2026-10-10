'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input, InputNumber, Popover, Spin } from 'antd';
import { CopyOutlined, MailOutlined, ShareAltOutlined } from '@ant-design/icons';
import { IconButton, LinkButton } from '@/src/ui-kit';
import AdminModal from '@/src/shared/components/AdminModal';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { apiError, mailerApi } from './mailerApi';
import FunnelView from './FunnelView';
import './mailer.scss';

const shareUrl = (token) => (typeof window === 'undefined' ? '' : `${window.location.origin}/funnel/${token}`);

const copy = async (text, t) => {
  try {
    await navigator.clipboard.writeText(text);
    appMessage.success(t('Link copied'));
  } catch { /* clipboard blocked — the link is visible in the popover */ }
};

function ShareButton() {
  const t = useT();
  const [token, setToken] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => { mailerApi.funnelShare().then((r) => setToken(r.token)).catch(() => {}); }, []);

  const toggle = async (next) => {
    if (next && !token) {
      const r = await mailerApi.setFunnelShare(true);
      setToken(r.token);
      copy(shareUrl(r.token), t);
    }
    setOpen(next);
  };
  const stop = async () => {
    await mailerApi.setFunnelShare(false);
    setToken('');
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={toggle}
      trigger="click"
      placement="bottomRight"
      content={token ? (
        <div className="mfunnel-share">
          <Input
            readOnly
            value={shareUrl(token)}
            onFocus={(e) => e.target.select()}
            suffix={<CopyOutlined onClick={() => copy(shareUrl(token), t)} />}
          />
          <LinkButton onClick={stop}>{t('Stop sharing')}</LinkButton>
        </div>
      ) : <Spin size="small" />}
    >
      <span className="mfunnel__trigger">
        <IconButton variant="primary" title={t('Share link')} aria-label={t('Share link')}><ShareAltOutlined /></IconButton>
      </span>
    </Popover>
  );
}

function InboxModal({ open, onClose, onSynced }) {
  const t = useT();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) mailerApi.inbox().then((r) => setForm({ ...r, imapPass: '' })).catch(() => setForm({}));
  }, [open]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await mailerApi.saveInbox({
        imapHost: form.imapHost, imapPort: form.imapPort, imapUser: form.imapUser, imapPass: form.imapPass || undefined,
      });
      setForm({ ...r, imapPass: '' });
      if (r.lastError) appMessage.error(r.lastError);
      else {
        appMessage.success(`${t('New replies')}: ${r.added}`);
        onSynced();
        onClose();
      }
    } catch (err) {
      appMessage.error(apiError(err, t('Could not save')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      title={t('Reply inbox')}
      open={open}
      onCancel={onClose}
      onSave={save}
      saveLoading={saving}
      saveDisabled={!form?.imapHost || !form?.imapUser}
      width={560}
      destroyOnHidden
    >
      {form ? (
        <div className="mailer-form">
          <div className="mailer-form__row">
            <label>
              <span>{t('IMAP server')}</span>
              <Input value={form.imapHost} onChange={set('imapHost')} placeholder="mail.tidrapportapp.se" />
            </label>
            <label style={{ flex: '0 0 96px' }}>
              <span>{t('Port')}</span>
              <InputNumber value={form.imapPort || 993} onChange={set('imapPort')} min={1} max={65535} style={{ width: '100%' }} />
            </label>
          </div>
          <label>
            <span>{t('Email')}</span>
            <Input value={form.imapUser} onChange={set('imapUser')} placeholder="alexander@tidrapportapp.se" autoComplete="off" />
          </label>
          <label>
            <span>{t('Password')}</span>
            <Input.Password value={form.imapPass} onChange={set('imapPass')} placeholder={form.hasPassword ? '••••••••' : ''} autoComplete="new-password" />
          </label>
          {form.lastSyncAt ? (
            <div className={form.lastError ? 'mfunnel-inbox__err' : 'mailer-muted'}>
              {form.lastError || `${t('Synced')} ${formatAdminDateTime(form.lastSyncAt)}`}
            </div>
          ) : null}
        </div>
      ) : <div className="mailer-spin"><Spin /></div>}
    </AdminModal>
  );
}

export default function MailerFunnelPage() {
  const t = useT();
  const [data, setData] = useState(null);
  const [brand, setBrand] = useState('');
  const [campaignIds, setCampaignIds] = useState([]);
  const [inboxOpen, setInboxOpen] = useState(false);

  const load = useCallback(() => {
    mailerApi.funnel({ brand: brand || undefined, campaignIds: campaignIds.join(',') || undefined })
      .then(setData)
      .catch((err) => appMessage.error(apiError(err, t('Could not load the funnel'))));
  }, [brand, campaignIds, t]);
  useEffect(load, [load]);

  const onBrand = (b) => { setBrand(b); setCampaignIds([]); };
  const onReply = async (id, body) => {
    try {
      await mailerApi.updateReply(id, body);
      load();
    } catch (err) {
      appMessage.error(apiError(err, t('Could not save')));
    }
  };

  if (!data) return <div className="mailer-spin"><Spin /></div>;

  return (
    <>
      <FunnelView
        data={data}
        brand={brand}
        onBrand={onBrand}
        campaignIds={campaignIds}
        onCampaigns={setCampaignIds}
        editable
        onReply={onReply}
        actions={(
          <>
            <IconButton variant="primary" title={t('Reply inbox')} aria-label={t('Reply inbox')} onClick={() => setInboxOpen(true)}><MailOutlined /></IconButton>
            <ShareButton />
          </>
        )}
      />
      <InboxModal open={inboxOpen} onClose={() => setInboxOpen(false)} onSynced={load} />
    </>
  );
}
