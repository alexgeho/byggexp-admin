import { useEffect, useState } from 'react';
import { Button, Modal, Popover, Typography, message } from 'antd';
import { CopyOutlined, MailOutlined, QuestionCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useLanguage } from '@/src/i18n/LanguageProvider';

// The company's private e-mail address for supplier invoices
// (faktura+<code>@byggexp.se). Mail sent there is read automatically and shows
// up in this list tagged "Från e-post".
export default function InboundAddressCard() {
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId;
  const canRegenerate = ['superadmin', 'companyAdmin'].includes(user?.role);
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!companyId || user?.role === 'worker') return;
    apiClient
      .get(`/company/${companyId}/inbound-address`)
      .then(({ data }) => setAddress(data?.address || ''))
      .catch(() => setAddress(''));
  }, [companyId, user?.role]);

  if (!address) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      message.success(t('Copied'));
    } catch {
      message.info(address);
    }
  };

  const regenerate = () => {
    Modal.confirm({
      title: t('New address'),
      content: t('The old address stops working immediately. Continue?'),
      onOk: async () => {
        setBusy(true);
        try {
          const { data } = await apiClient.post(`/company/${companyId}/inbound-address/regenerate`);
          setAddress(data?.address || '');
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const help = (
    <div style={{ maxWidth: 360 }}>
      <p style={{ marginTop: 0 }}>{t('Give this address to your suppliers, or forward invoices to it automatically:')}</p>
      <p><b>Gmail:</b> {t('Settings → Filters and blocked addresses → Create a filter (sender) → Forward to this address.')}</p>
      <p style={{ marginBottom: 0 }}><b>Outlook:</b> {t('Settings → Mail → Rules → Add rule (sender) → Forward to this address.')}</p>
    </div>
  );

  return (
    <div className="inbound-address-card">
      <MailOutlined className="inbound-address-card__icon" />
      <div className="inbound-address-card__text">
        <div className="inbound-address-card__label">{t('Your address for supplier invoices')}</div>
        <Typography.Text strong className="inbound-address-card__address">{address}</Typography.Text>
        <div className="inbound-address-card__hint">
          {t('PDFs and photos sent here are read automatically and appear in this list.')}
        </div>
      </div>
      <div className="inbound-address-card__actions">
        <Button icon={<CopyOutlined />} onClick={copy}>{t('Copy')}</Button>
        <Popover content={help} trigger="click" placement="bottomRight">
          <Button icon={<QuestionCircleOutlined />}>{t('How?')}</Button>
        </Popover>
        {canRegenerate ? (
          <Button icon={<ReloadOutlined />} loading={busy} onClick={regenerate}>{t('New address')}</Button>
        ) : null}
      </div>
    </div>
  );
}
