'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Card, Space } from 'antd';
import InvoiceForm from '@/src/features/invoicing/components/InvoiceForm';
import { useInvoiceStore } from '@/src/store/invoiceStore';
import { useT } from '@/src/i18n/LanguageProvider';
import { useLocation, useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';

export default function InvoiceCreatePage() {
  const { pathname } = useLocation();
  const t = useT();
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();
  // The handed-off prefill (offer, hours, ÄTA...). Not cleared on mount: the
  // page can mount twice (slow laptop, remount) and the second mount must get
  // it too (19.11). Cleared when the form is left; ignored if older than 30 min.
  const [prefill] = useState(() => {
    const { draftPrefill, draftPrefillAt } = useInvoiceStore.getState();
    return draftPrefill && Date.now() - (draftPrefillAt || 0) < 30 * 60 * 1000 ? draftPrefill : null;
  });

  useEffect(() => {
    hideHeaderActions();

    return () => showHeaderActions();
  }, [hideHeaderActions, showHeaderActions]);

  const goBackToInvoices = () => {
    useInvoiceStore.getState().clearDraftPrefill();
    navigate(pathname.replace(/\/new$/, ''));
  };

  return (
    <div className="invoice-create-page">
      <Space className="invoice-create-page__toolbar" align="center">
        <Button icon={<ArrowLeftOutlined />} onClick={goBackToInvoices}>
          {t('Back to invoices')}
        </Button>
      </Space>

      <Card
        className="invoice-create-page__card"
        title={t('Create invoice')}
        extra={<Button onClick={goBackToInvoices}>{t('Cancel')}</Button>}
      >
        <InvoiceForm onClose={goBackToInvoices} prefill={prefill} />
      </Card>
    </div>
  );
}
