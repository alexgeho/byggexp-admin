'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Card, Space, Spin, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import InvoiceForm from '@/src/features/invoicing/components/InvoiceForm';
import { useLocation, useNavigate, useOutletContext, useParams } from '@/src/shared/routing/routerCompat';
import { formatApiError } from '@/src/utils/formError';

export default function InvoiceEditPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hideHeaderActions();

    return () => showHeaderActions();
  }, [hideHeaderActions, showHeaderActions]);

  const loadInvoice = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.get(`/invoices/${id}`);
      setInvoice(data);
    } catch (err) {
      setInvoice(null);
      message.error(formatApiError(err, 'Failed to load invoice'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  const goBackToInvoices = () => {
    navigate(pathname.replace(/\/[^/]+\/edit$/, ''));
  };

  if (loading) {
    return (
      <div className="invoice-create-page">
        <Spin size="large" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="invoice-create-page">
        <Button icon={<ArrowLeftOutlined />} onClick={goBackToInvoices}>
          Back to invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="invoice-create-page">
      <Space className="invoice-create-page__toolbar" align="center">
        <Button icon={<ArrowLeftOutlined />} onClick={goBackToInvoices}>
          Back to invoices
        </Button>
      </Space>

      <Card
        className="invoice-create-page__card"
        title="Edit invoice"
        extra={(
          <Space>
            <Button onClick={goBackToInvoices}>Cancel</Button>
            <Button type="primary" htmlType="submit" form="invoice-form">
              Save invoice
            </Button>
          </Space>
        )}
      >
        <InvoiceForm onClose={goBackToInvoices} invoiceToEdit={invoice} />
      </Card>
    </div>
  );
}
