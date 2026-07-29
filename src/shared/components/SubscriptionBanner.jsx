'use client';

import { useEffect, useState } from 'react';
import { Alert, Button } from 'antd';
import Link from 'next/link';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useT } from '@/src/i18n/LanguageProvider';

// Shows a renew prompt when the company's subscription needs attention
// (past_due / canceled / unpaid). Silent for active/trialing and when billing
// isn't configured, so it never nags companies that haven't opted in.
export default function SubscriptionBanner() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState(null);
  const isOwner = user?.role === 'companyAdmin';

  useEffect(() => {
    if (!isOwner) return;
    apiClient.get('/billing/status')
      .then((res) => setStatus(res.data))
      .catch(() => setStatus(null));
  }, [isOwner]);

  const s = status?.status;
  if (!isOwner || !status?.enabled || !s || s === 'trialing' || s === 'active') {
    return null;
  }

  const isPastDue = s === 'past_due';
  return (
    <Alert
      type={isPastDue ? 'warning' : 'error'}
      showIcon
      banner
      message={isPastDue
        ? t('Payment failed — please update your card')
        : t('Your subscription is inactive')}
      action={(
        <Link href="/company/billing">
          <Button size="small" type="primary">{t('Manage subscription')}</Button>
        </Link>
      )}
      style={{ marginBottom: 12 }}
    />
  );
}
