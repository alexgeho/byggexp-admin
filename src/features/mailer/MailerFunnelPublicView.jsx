'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from '@/src/shared/routing/routerCompat';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { useT } from '@/src/i18n/LanguageProvider';
import { mailerApi } from './mailerApi';
import FunnelView from './FunnelView';

// Read-only funnel behind the share link: no e-mail addresses or mail texts.
export default function MailerFunnelPublicView() {
  const t = useT();
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [brand, setBrand] = useState('');
  const [period, setPeriod] = useState(null);

  const load = useCallback(() => {
    mailerApi.publicFunnel(token, { brand: brand || undefined, from: period?.[0], to: period?.[1] })
      .then((d) => { setData(d); setError(false); })
      .catch(() => setError(true));
  }, [token, brand, period]);
  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 60000);
    return () => clearInterval(timer);
  }, [load]);

  if (error) return <div className="mfunnel-public__center">{t('This link has expired or is invalid')}</div>;
  if (!data) return <div className="mfunnel-public__center">{t('Loading…')}</div>;

  return (
    <div className="mfunnel-public">
      <div className="mfunnel-public__inner">
        <header className="mfunnel-public__head">
          <h1 className="mfunnel-public__title">{t('Email funnel')}</h1>
          <span className="mfunnel-public__date">{formatAdminDateTime(data.updatedAt)}</span>
        </header>
        <FunnelView data={data} brand={brand} onBrand={setBrand} period={period} onPeriod={setPeriod} />
      </div>
    </div>
  );
}
