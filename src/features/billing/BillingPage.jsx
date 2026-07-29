'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Segmented, Spin, Tag } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import './BillingPage.scss';

// Plan presentation only — real prices live in Stripe and are shown on the
// Checkout page. Edit the feature lists to match your actual tiers.
const PLANS = [
  {
    key: 'basic',
    name: 'Basic',
    features: ['Projekt & uppgifter', 'Tidrapportering (Arbetspass)', 'Fakturor & offerter'],
  },
  {
    key: 'pro',
    name: 'Pro',
    highlight: true,
    features: ['Allt i Basic', 'Lönsamhet & rapporter', 'OCR-skanning av kvitton', 'Prioriterad support'],
  },
];

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

  if (!status?.enabled) {
    return (
      <Alert
        type="info"
        showIcon
        message={t('Subscriptions are not set up yet')}
        description={t('Billing will be available once payment is configured.')}
      />
    );
  }

  const hasSubscription = status.active || status.hasCustomer;

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
          <div className="billing-head">
            <div>
              <h3>{t('Choose a plan')}</h3>
              <p>{t('14 days free, then billed automatically. Cancel anytime.')}</p>
            </div>
            <Segmented
              value={interval}
              onChange={setInterval}
              options={[
                { value: 'monthly', label: t('Monthly') },
                { value: 'yearly', label: t('Yearly') },
              ]}
            />
          </div>
          <div className="billing-plans">
            {PLANS.map((plan) => (
              <Card
                key={plan.key}
                className={`billing-plan${plan.highlight ? ' billing-plan--highlight' : ''}`}
              >
                {plan.highlight ? <span className="billing-plan__badge">{t('Most popular')}</span> : null}
                <h4 className="billing-plan__name">{plan.name}</h4>
                <ul className="billing-plan__features">
                  {plan.features.map((f) => (
                    <li key={f}><CheckOutlined /> {f}</li>
                  ))}
                </ul>
                <Button
                  type={plan.highlight ? 'primary' : 'default'}
                  block
                  loading={busy === plan.key}
                  onClick={() => subscribe(plan.key)}
                >
                  {t('Start free trial')}
                </Button>
              </Card>
            ))}
          </div>
          <p className="billing-note">{t('The exact price and VAT are shown on the secure Stripe checkout page. Your card is handled by Stripe — we never see it.')}</p>
        </>
      )}
    </div>
  );
}
