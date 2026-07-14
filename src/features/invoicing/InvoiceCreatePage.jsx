'use client';

import { useEffect } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Card, Space } from 'antd';
import InvoiceForm from '@/src/features/invoicing/components/InvoiceForm';
import { useLocation, useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';

export default function InvoiceCreatePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();

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
          Back to invoices
        </Button>
      </Space>

      <Card
        className="invoice-create-page__card"
        title="Create invoice"
      >
        <InvoiceForm onClose={goBackToInvoices} submitLabel="Create invoice" />
      </Card>
    </div>
  );
}
