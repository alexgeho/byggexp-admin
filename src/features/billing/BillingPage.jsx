'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Segmented, Spin, Tag } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import './BillingPage.scss';

// Plans mirror byggexp.se/sv. Monthly price in SEK; yearly is −10%. The charge
// happens via the Stripe price configured for each tier (STRIPE_PRICE_<TIER>_*).
const PLANS = [
  { key: 'start', name: 'Start', monthly: 499, seats: '1–10 användare' },
  { key: 'tillvaxt', name: 'Tillväxt', monthly: 899, seats: '10–20 användare' },
  { key: 'professionell', name: 'Professionell', monthly: 1799, seats: '20–40 användare' },
];
const FEATURES = [
  'Alla funktioner ingår',
  'Obegränsat antal projekt',
  'Ingen bindningstid',
  'Mobilapp + Adminpanel',
];
const DEMO_URL = 'https://byggexp.se/sv';

const STATUS_TAG = {
  trialing: { color: 'blue', label: 'Trial' },
  active: { color: 'green', label: 'Active' },
  past_due: { color: 'orange', label: 'Past due' },
  canceled: { color: 'default', label: 'Canceled' },
  unpaid: { color: 'red', label: 'Unpaid' },
  incomplete: { color: 'orange', label: 'Incomplete' },
};

export default function BillingPage() {
  const { t } = useLanguage();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState('monthly');
  const [busy, setBusy] = useState('');

  const load = () => {
    setLoading(true);
    apiClient.get('/billing/status')
      .then((res) => setStatus(res.data))
      .catch(() => setStatus({ enabled: false }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') appMessage.success(t('Subscription started — thank you!'));
    if (params.get('checkout') === 'cancel') appMessage.info(t('Checkout cancelled'));
  }, [t]);

  const subscribe = async (plan) => {
    setBusy(plan);
    try {
      const { data } = await apiClient.post('/billing/checkout', { plan, interval });
      window.location.assign(data.url);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not start checkout'));
      setBusy('');
    }
  };

  const manage = async () => {
    setBusy('manage');
    try {
      const { data } = await apiClient.post('/billing/portal', {});
      window.location.assign(data.url);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not open the billing portal'));
      setBusy('');
    }
  };

  const currentLabel = useMemo(() => {
    if (!status?.status) return null;
    return STATUS_TAG[status.status] || { color: 'default', label: status.status };
  }, [status]);

  if (loading) {
    return <div className="billing-loading"><Spin /></div>;
  }

  const hasSubscription = status?.active || status?.hasCustomer;

  return (
    <div className="billing-page">
      {hasSubscription ? (
        <Card className="dashboard-section-card billing-current">
          <div className="billing-current__head">
            <div>
              <span className="billing-current__label">{t('Your plan')}</span>
              <div className="billing-current__plan">
                {status.plan ? status.plan.toUpperCase() : t('No active plan')}
                {currentLabel ? <Tag color={currentLabel.color}>{t(currentLabel.label)}</Tag> : null}
              </div>
              <div className="billing-current__meta">
                {status.status === 'trialing' && status.trialEndsAt
                  ? `${t('Trial ends')} ${formatAdminDate(status.trialEndsAt)}`
                  : status.cancelAtPeriodEnd && status.currentPeriodEnd
                    ? `${t('Ends')} ${formatAdminDate(status.currentPeriodEnd)}`
                    : status.currentPeriodEnd
                      ? `${t('Renews')} ${formatAdminDate(status.currentPeriodEnd)}`
                      : ''}
              </div>
            </div>
            <Button type="primary" loading={busy === 'manage'} onClick={manage}>
              {t('Manage subscription')}
            </Button>
          </div>
          <p className="billing-current__hint">
            {t('Cancel, change card or download invoices/receipts in the billing portal.')}
          </p>
        </Card>
      ) : (
        <>
          {!status?.enabled ? (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={t('Subscriptions are not set up yet')}
              description={t('Billing will be available once payment is configured.')}
            />
          ) : null}
          <div className="billing-head">
            <div>
              <h3>{t('Choose a plan')}</h3>
              <p>{t('First month free. Cancel anytime.')}</p>
            </div>
            <Segmented
              value={interval}
              onChange={setInterval}
              options={[
                { value: 'monthly', label: t('Monthly') },
                { value: 'yearly', label: `${t('Yearly')} −10%` },
              ]}
            />
          </div>
          <div className="billing-plans">
            {PLANS.map((plan) => {
              const perMonth = interval === 'yearly' ? Math.round(plan.monthly * 0.9) : plan.monthly;
              const yearTotal = Math.round(plan.monthly * 12 * 0.9);
              return (
                <Card key={plan.key} className="billing-plan">
                  <h4 className="billing-plan__name">{plan.name}</h4>
                  <div className="billing-plan__price">
                    <strong>{perMonth}</strong> kr<span>/{t('mo')}</span>
                  </div>
                  <div className="billing-plan__seats">{plan.seats}</div>
                  {interval === 'yearly'
                    ? <div className="billing-plan__year">{t('Billed yearly')} · {yearTotal} kr/{t('yr')}</div>
                    : null}
                  <ul className="billing-plan__features">
                    {FEATURES.map((f) => <li key={f}><CheckOutlined /> {f}</li>)}
                  </ul>
                  <Button type="primary" block loading={busy === plan.key} disabled={!status?.enabled} onClick={() => subscribe(plan.key)}>
                    {t('Start free trial')}
                  </Button>
                </Card>
              );
            })}
            <Card className="billing-plan billing-plan--custom">
              <h4 className="billing-plan__name">Anpassad</h4>
              <div className="billing-plan__price"><strong>{t("Let's talk")}</strong></div>
              <div className="billing-plan__seats">40+ användare</div>
              <ul className="billing-plan__features">
                {FEATURES.map((f) => <li key={f}><CheckOutlined /> {f}</li>)}
              </ul>
              <Button block onClick={() => window.open(DEMO_URL, '_blank', 'noopener')}>
                {t('Book a demo')}
              </Button>
            </Card>
          </div>
          <p className="billing-note">{t('The exact price and VAT are shown on the secure Stripe checkout page. Your card is handled by Stripe — we never see it.')}</p>
        </>
      )}
    </div>
  );
}
