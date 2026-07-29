'use client';

import { useEffect, useState } from 'react';
import { Button, Spin } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, MinusCircleFilled, MailOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import './SystemStatusPage.scss';

// Superadmin at-a-glance board of which integrations are activated. Reads only
// booleans from the API (never secret values) so it's safe to show.
export default function SystemStatusPage() {
  const t = useT();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const load = () => {
    setLoading(true);
    apiClient
      .get('/system/integrations')
      .then(({ data }) => setStatus(data))
      .catch(() => appMessage.error(t('Could not load system status')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendTest = async () => {
    setTesting(true);
    try {
      const { data } = await apiClient.post('/system/test-email', {});
      appMessage.success(t('Test email sent to {x}').replace('{x}', data.to));
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not send test email'));
    } finally {
      setTesting(false);
    }
  };

  if (loading || !status) {
    return <div className="sysstat__spin"><Spin /></div>;
  }

  const rows = [
    {
      key: 'smtp',
      ok: status.smtp,
      label: t('Email (SMTP)'),
      desc: t('Sends invite and invoice emails'),
      unlocks: 'SMTP_HOST · SMTP_USER · SMTP_PASS',
    },
    {
      key: 'stripe',
      ok: status.stripe,
      label: t('Payments (Stripe)'),
      desc: t('Self-serve subscriptions and billing'),
      unlocks: 'STRIPE_SECRET_KEY',
      subs: [
        { label: t('Webhook secret'), ok: status.stripeWebhook },
        { label: t('Paywall enforced'), ok: status.billingEnforced, neutral: true },
      ],
    },
    {
      key: 'inboundEmail',
      ok: status.inboundEmail,
      label: t('Inbound invoices'),
      desc: t('faktura@ inbox → draft invoices'),
      unlocks: 'INBOUND_INVOICE_TOKEN',
    },
    {
      key: 'deepl',
      ok: status.deepl,
      label: t('Chat auto-translate'),
      desc: t('Translates chat messages (DeepL)'),
      unlocks: 'DEEPL_API_KEY',
    },
    {
      key: 'anthropic',
      ok: status.anthropic,
      label: t('Receipt scanning'),
      desc: t('OCR of receipts and invoices (Claude)'),
      unlocks: 'ANTHROPIC_API_KEY',
    },
    {
      key: 'appPublicUrl',
      ok: status.appPublicUrl,
      label: t('Public URL'),
      desc: t('Absolute links in emails'),
      unlocks: 'APP_PUBLIC_URL',
    },
  ];

  const activeCount = rows.filter((r) => r.ok).length;

  return (
    <div className="sysstat">
      <div className="sysstat__summary">
        {t('{n} of {total} integrations active')
          .replace('{n}', String(activeCount))
          .replace('{total}', String(rows.length))}
      </div>

      {rows.map((row) => (
        <div key={row.key} className={`sysstat__card${row.ok ? ' sysstat__card--on' : ''}`}>
          <span className={`sysstat__dot sysstat__dot--${row.ok ? 'on' : 'off'}`}>
            {row.ok ? <CheckCircleFilled /> : <CloseCircleFilled />}
          </span>
          <div className="sysstat__body">
            <div className="sysstat__label">{row.label}</div>
            <div className="sysstat__desc">{row.desc}</div>
            {row.subs ? (
              <div className="sysstat__subs">
                {row.subs.map((s) => (
                  <span key={s.label} className="sysstat__sub">
                    {s.neutral ? (
                      <MinusCircleFilled className={s.ok ? 'sysstat__sub-on' : 'sysstat__sub-neutral'} />
                    ) : s.ok ? (
                      <CheckCircleFilled className="sysstat__sub-on" />
                    ) : (
                      <CloseCircleFilled className="sysstat__sub-off" />
                    )}
                    {s.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="sysstat__right">
            <code className="sysstat__env">{row.unlocks}</code>
            {row.key === 'smtp' ? (
              <Button
                size="small"
                icon={<MailOutlined />}
                disabled={!row.ok}
                loading={testing}
                onClick={sendTest}
              >
                {t('Send test email')}
              </Button>
            ) : null}
          </div>
        </div>
      ))}

      <div className="sysstat__foot">
        {t('Set values as GitHub Secrets, then redeploy. Empty secrets are left untouched.')}
      </div>
    </div>
  );
}
