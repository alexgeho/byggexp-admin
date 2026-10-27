import { useEffect, useState } from 'react';
import { Popconfirm, message } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import { formatApiError } from '@/src/utils/formError';
import { useT } from '@/src/i18n/LanguageProvider';
import { connectFortnox, disconnectFortnox, fetchFortnoxStatus } from '@/src/features/fortnox/fortnoxApi';

// Company ↔ Fortnox link. Connect sends the admin to Fortnox (OAuth); the
// backend callback brings them back here with ?fortnox=connected|error.
export default function FortnoxCard() {
  const t = useT();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchFortnoxStatus().then(setStatus).catch(() => setStatus({ configured: false }));
    const params = new URLSearchParams(window.location.search);
    const result = params.get('fortnox');
    if (result) {
      if (result === 'connected') message.success(t('Fortnox connected'));
      else {
        const reason = params.get('reason');
        message.error(reason ? `${t('Could not connect Fortnox')}: ${reason}` : t('Could not connect Fortnox'));
      }
      params.delete('fortnox');
      params.delete('reason');
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
  }, [t]);

  const connect = async () => {
    setBusy(true);
    try {
      await connectFortnox();
    } catch (err) {
      setBusy(false);
      message.error(formatApiError(err, t('Could not connect Fortnox')));
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectFortnox();
      setStatus((s) => ({ ...s, connected: false, needsReconnect: false, companyName: '' }));
    } catch (err) {
      message.error(formatApiError(err, t('Failed to save')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-page__card">
      <div className="profile-page__card-header">
        <ApiOutlined className="profile-page__card-icon" />
        <div>
          <h3 className="profile-page__card-title">Fortnox</h3>
          {status?.connected && status.companyName ? (
            <p className="profile-page__card-subtitle">{status.companyName}</p>
          ) : null}
        </div>
      </div>
      {status?.connected && !status.supplierInvoices ? (
        // New permission (supplier invoices): one reconnect grants it.
        <Button type="primary" onClick={connect} loading={busy}>{t('Reconnect')}</Button>
      ) : status?.connected ? (
        <Popconfirm
          title={t('Disconnect Fortnox?')}
          okText={t('Disconnect')}
          cancelText={t('Cancel')}
          onConfirm={disconnect}
        >
          <Button danger loading={busy}>{t('Disconnect')}</Button>
        </Popconfirm>
      ) : (
        <Button
          onClick={connect}
          loading={busy}
          disabled={!status?.configured}
          // ui-button keeps its colour when disabled; inactive must read pale.
          style={status?.configured ? undefined : { opacity: 0.45 }}
        >
          {t('Connect')}
        </Button>
      )}
    </div>
  );
}
