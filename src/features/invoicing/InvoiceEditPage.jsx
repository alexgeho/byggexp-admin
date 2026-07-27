'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftOutlined, DownloadOutlined, EyeOutlined, MailOutlined } from '@ant-design/icons';
import { Button, Card, Input, Modal, Space, Spin, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import InvoiceForm from '@/src/features/invoicing/components/InvoiceForm';
import { downloadInvoicePdf, previewInvoicePdf } from '@/src/features/invoicing/invoicePdf';
import { useLocation, useNavigate, useOutletContext, useParams } from '@/src/shared/routing/routerCompat';
import { formatApiError } from '@/src/utils/formError';

export default function InvoiceEditPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sending, setSending] = useState(false);

  const openSend = () => {
    setSendEmail(invoice?.email || '');
    setSendMessage('');
    setSendOpen(true);
  };

  const handleSend = async () => {
    if (!sendEmail.trim()) {
      message.warning('Enter a recipient email');
      return;
    }
    setSending(true);
    try {
      const { data } = await apiClient.post(`/invoices/${id}/send`, {
        email: sendEmail.trim(),
        message: sendMessage.trim() || undefined,
      });
      message.success(data?.sent ? `Invoice sent to ${data.to}` : 'Email not sent (SMTP not configured)');
      setSendOpen(false);
    } catch (err) {
      message.error(formatApiError(err, 'Failed to send invoice'));
    } finally {
      setSending(false);
    }
  };

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
        <Button icon={<EyeOutlined />} onClick={() => previewInvoicePdf(invoice)}>
          Preview PDF
        </Button>
        <Button icon={<DownloadOutlined />} onClick={() => downloadInvoicePdf(invoice)}>
          Download PDF
        </Button>
        <Button type="primary" icon={<MailOutlined />} onClick={openSend}>
          Send by email
        </Button>
      </Space>

      <Modal
        title={`Send invoice ${invoice.invoiceNumber} by email`}
        open={sendOpen}
        onCancel={() => setSendOpen(false)}
        onOk={handleSend}
        okText="Send"
        confirmLoading={sending}
        destroyOnHidden
      >
        <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Recipient email</label>
        <Input
          type="email"
          placeholder="customer@example.com"
          value={sendEmail}
          onChange={(e) => setSendEmail(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Message (optional)</label>
        <Input.TextArea
          rows={3}
          placeholder="Add a short note to the customer…"
          value={sendMessage}
          onChange={(e) => setSendMessage(e.target.value)}
        />
        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: 'var(--muted, #64748b)' }}>
          The invoice PDF is attached automatically.
        </p>
      </Modal>

      <Card
        className="invoice-create-page__card"
        title="Edit invoice"
        extra={(
          <Space>
            <Button icon={<DownloadOutlined />} onClick={() => downloadInvoicePdf(invoice)}>
              PDF
            </Button>
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
