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
  const consumeDraftPrefill = useInvoiceStore((state) => state.consumeDraftPrefill);
  // Consume any handed-off prefill (e.g. from Hours) exactly once on mount.
  const [prefill] = useState(() => consumeDraftPrefill());

  useEffect(() => {
    hideHeaderActions();

    return () => showHeaderActions();
  }, [hideHeaderActions, showHeaderActions]);

  const goBackToInvoices = () => {
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
      >
        <InvoiceForm onClose={goBackToInvoices} prefill={prefill} />
      </Card>
    </div>
  );
}
