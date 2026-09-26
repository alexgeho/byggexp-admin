'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Segmented, Spin, Tag } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import './BillingPage.scss';

// Plans mirror byggexp.se/sv (from 2026-09-25). Live prices come from
// GET /billing/plans (Stripe); the numbers here are only the display fallback
// while a Stripe price is missing — buying such a plan is disabled.
// Monthly SEK excl. VAT. Per-seat plans: base fee incl. INCLUDED_SEATS users +
// a fee per extra user. Yearly = 12 × monthly with a 15% discount.
const PLANS = [
  {
    key: 'faktura',
    name: 'Faktura',
    monthly: 299,
    perSeat: false,
    maxUsers: 2,
    features: [
      'Offers, invoices and invoice reminders',
      'Payroll, payslips and AGI',
      'Project economy: budget, estimate and profitability',
      'Scan receipts and invoices, booked to the project',
      'Supplier invoices and expenses',
      'Personal finance (coming soon)',
    ],
  },
  {
    key: 'projekt',
    name: 'Projekt',
    monthly: 690,
    extraSeat: 69,
    perSeat: true,
    features: [
      'Projects, tasks and photos',
      'GPS clock-in',
      'Diary and self-inspections',
      'Planning and staffing',
      'Absence',
      'Tools with QR codes',
      'Mobile app + admin panel',
    ],
  },
  {
    key: 'komplett',
    name: 'Komplett',
    monthly: 990,
    extraSeat: 119,
    perSeat: true,
    recommended: true,
    features: ['Everything in Projekt', 'Everything in Faktura'],
  },
];
// Plans sold before 2026-09-25 — shown as a company's current plan only.
const LEGACY_PLAN_NAMES = { start: 'Start', tillvaxt: 'Tillväxt', professionell: 'Professionell' };
const INCLUDED_SEATS = 10;
const YEARLY_FACTOR = 12 * 0.85;
const ADDON = {
  key: 'integrations',
  monthly: 199,
  features: [
    'SIE4 export to Fortnox, Visma and BL',
    'Supplier invoices via e-mail',
    'Custom integrations for an extra fee',
  ],
};
const SELF_SERVE_MAX_USERS = 40;
const DEMO_URL = 'https://byggexp.se/sv';

const STATUS_TAG = {
  trialing: { color: 'blue', label: 'Trial' },
  active: { color: 'green', label: 'Active' },
  past_due: { color: 'orange', label: 'Past due' },
  canceled: { color: 'default', label: 'Canceled' },
  unpaid: { color: 'red', label: 'Unpaid' },
  incomplete: { color: 'orange', label: 'Incomplete' },
};

const formatKr = (n) => Number(n).toLocaleString('sv-SE', { maximumFractionDigits: 2 });

const planName = (key) =>
  PLANS.find((p) => p.key === key)?.name || LEGACY_PLAN_NAMES[key] || key;

export default function BillingPage() {
  const { t, lang } = useLanguage();
  // Norwegian users go to the .no landing site; everyone else to byggexp.se.
  const demoUrl = lang === 'nb' ? 'https://byggexp.no' : DEMO_URL;
  const [status, setStatus] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState('monthly');
  const [withAddon, setWithAddon] = useState(false);
  const [busy, setBusy] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/billing/status').then((res) => res.data).catch(() => ({ enabled: false })),
      apiClient.get('/billing/plans').then((res) => res.data).catch(() => null),
    ])
      .then(([statusData, plansData]) => {
        setStatus(statusData);
        setCatalog(plansData);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') appMessage.success(t('Subscription started — thank you!'));
    if (params.get('checkout') === 'cancel') appMessage.info(t('Checkout cancelled'));
  }, [t]);

  const includedSeats = catalog?.includedSeats || INCLUDED_SEATS;
  const factor = interval === 'yearly' ? YEARLY_FACTOR : 1;

  // Live Stripe price for the selected interval, else the hardcoded fallback.
  const priceFor = (plan) => {
    const live = catalog?.plans?.find((p) => p.tier === plan.key)?.prices?.[interval];
    const hasLive = Boolean(live?.priceId) && live.amount != null;
    return {
      available: hasLive,
      base: hasLive ? live.amount : plan.monthly * factor,
      extra: plan.perSeat
        ? (hasLive && live.perSeat != null ? live.perSeat : plan.extraSeat * factor)
        : 0,
      included: plan.perSeat ? (hasLive && live.includedSeats) || includedSeats : null,
    };
  };

  const addonLive = catalog?.addons?.find((a) => a.addon === ADDON.key)?.prices?.[interval];
  const addonAvailable = Boolean(addonLive?.priceId) && addonLive.amount != null;
  const addonPrice = addonAvailable ? addonLive.amount : ADDON.monthly * factor;

  const seats = typeof status?.billableSeats === 'number' ? status.billableSeats : null;
  const totalUsers = typeof status?.totalUsers === 'number' ? status.totalUsers : null;
  const periodLabel = interval === 'yearly' ? t('yr') : t('mo');

  const subscribe = async (plan) => {
    setBusy(plan);
    try {
      const body = { plan, interval };
      if (withAddon && addonAvailable) body.addons = [ADDON.key];
      const { data } = await apiClient.post('/billing/checkout', body);
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

  // A Stripe customer alone (e.g. from an abandoned checkout) is not a
  // subscription — keep showing the plans until one actually exists.
  const hasSubscription = Boolean(status?.status) && !['canceled', 'incomplete_expired'].includes(status.status);

  const seatsInfo = seats != null ? (
    <div className="billing-seats">
      <strong>{t('Billable users now: {n}').replace('{n}', seats)}</strong>
      <span>{t('Office roles always count; workers only if they clocked in during the last 30 days.')}</span>
    </div>
  ) : null;

  return (
    <div className="billing-page">
      {hasSubscription ? (
        <Card className="dashboard-section-card billing-current">
          <div className="billing-current__head">
            <div>
              <span className="billing-current__label">{t('Your plan')}</span>
              <div className="billing-current__plan">
                {status.plan ? planName(status.plan) : t('No active plan')}
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
          {seatsInfo}
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
              <p>{t('2 weeks free with all features. Cancel anytime.')} {t('All prices excl. VAT.')}</p>
            </div>
            <Segmented
              value={interval}
              onChange={setInterval}
              options={[
                { value: 'monthly', label: t('Monthly') },
                { value: 'yearly', label: `${t('Yearly')} · ${t('15% off')}` },
              ]}
            />
          </div>
          {seatsInfo}
          <div className="billing-plans">
            {PLANS.map((plan) => {
              const price = priceFor(plan);
              const total = plan.perSeat && seats != null
                ? price.base + Math.max(0, seats - price.included) * price.extra
                : null;
              // Flat plans cap users (Faktura: 2). Warn and block instead of
              // selling a plan the company already outgrew.
              const overCap = !plan.perSeat && plan.maxUsers && totalUsers != null
                && totalUsers > plan.maxUsers;
              return (
                <Card
                  key={plan.key}
                  className={`billing-plan${plan.recommended ? ' billing-plan--highlight' : ''}`}
                >
                  {plan.recommended ? <span className="billing-plan__badge">{t('Recommended')}</span> : null}
                  <h4 className="billing-plan__name">{t(plan.key) === plan.key ? plan.name : t(plan.key)}</h4>
                  <div className="billing-plan__price">
                    <strong>{formatKr(price.base)}</strong> kr<span>/{periodLabel}</span>
                  </div>
                  <div className="billing-plan__seats">
                    {plan.perSeat
                      ? `${t('incl. {n} users').replace('{n}', price.included)} · +${formatKr(price.extra)} kr/${periodLabel} ${t('per extra user')}`
                      : t('Max {n} users').replace('{n}', plan.maxUsers)}
                  </div>
                  {interval === 'yearly'
                    ? <div className="billing-plan__year">{t('Billed yearly')} · {t('15% off')}</div>
                    : null}
                  {total != null ? (
                    <div className="billing-plan__total">
                      {t('With your {n} users').replace('{n}', seats)}: <strong>{formatKr(total)} kr/{periodLabel}</strong>
                    </div>
                  ) : null}
                  {overCap ? (
                    <Alert
                      type="warning"
                      showIcon
                      className="billing-plan__warning"
                      message={t('You have {n} users – {plan} allows max {max}. Choose Komplett.')
                        .replace('{n}', totalUsers)
                        .replace('{plan}', plan.name)
                        .replace('{max}', plan.maxUsers)}
                    />
                  ) : null}
                  <ul className="billing-plan__features">
                    {plan.features.map((f) => <li key={f}><CheckOutlined /> {t(f)}</li>)}
                  </ul>
                  <Button
                    type={plan.recommended ? 'primary' : 'default'}
                    block
                    loading={busy === plan.key}
                    disabled={!status?.enabled || !price.available || overCap}
                    onClick={() => subscribe(plan.key)}
                  >
                    {t('Start free trial')}
                  </Button>
                  {status?.enabled && !price.available
                    ? <div className="billing-plan__unavailable">{t('Not available yet')}</div>
                    : null}
                </Card>
              );
            })}
          </div>
          <Card className="billing-addon">
            <Checkbox
              checked={withAddon && addonAvailable}
              disabled={!addonAvailable}
              onChange={(e) => setWithAddon(e.target.checked)}
            >
              <strong>{t('Add Integrations')}</strong>{' '}
              <span className="billing-addon__price">+{formatKr(addonPrice)} kr/{periodLabel}</span>
            </Checkbox>
            <ul className="billing-plan__features billing-addon__features">
              {ADDON.features.map((f) => <li key={f}><CheckOutlined /> {t(f)}</li>)}
            </ul>
            {status?.enabled && !addonAvailable
              ? <div className="billing-plan__unavailable">{t('Not available yet')}</div>
              : null}
          </Card>
          <Card className="billing-custom">
            <div>
              <strong>{t('More than {n} users?').replace('{n}', SELF_SERVE_MAX_USERS)}</strong>
              <span>{t('Contact us for a special offer.')}</span>
            </div>
            <Button onClick={() => window.open(demoUrl, '_blank', 'noopener')}>
              {t('Book a demo')}
            </Button>
          </Card>
          <p className="billing-note">{t('The exact price and VAT are shown on the secure Stripe checkout page. Your card is handled by Stripe — we never see it.')}</p>
        </>
      )}
    </div>
  );
}
