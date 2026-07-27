import { useEffect, useState } from 'react';
import { Input, Modal, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

// Modal to email an invoice PDF to the customer. `invoice` must already be saved
// (have an id); the PDF is attached server-side.
export default function SendInvoiceModal({ invoice, open, onClose, onSent }) {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(invoice?.email || '');
      setNote('');
    }
  }, [open, invoice]);

  const handleSend = async () => {
    if (!email.trim()) {
      message.warning('Enter a recipient email');
      return;
    }
    const id = getEntityId(invoice);
    if (!id) {
      message.error('Save the invoice first');
      return;
    }
    setSending(true);
    try {
      const { data } = await apiClient.post(`/invoices/${id}/send`, {
        email: email.trim(),
        message: note.trim() || undefined,
      });
      message.success(data?.sent ? `Invoice sent to ${data.to}` : 'Email not sent (SMTP not configured)');
      onSent?.(data);
    } catch (err) {
      message.error(formatApiError(err, 'Failed to send invoice'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      title={invoice?.invoiceNumber ? `Send invoice ${invoice.invoiceNumber} by email` : 'Send invoice by email'}
      open={open}
      onCancel={onClose}
      onOk={handleSend}
      okText="Send"
      confirmLoading={sending}
      destroyOnHidden
    >
      <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Recipient email</label>
      <Input
        type="email"
        placeholder="customer@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Message (optional)</label>
      <Input.TextArea
        rows={3}
        placeholder="Add a short note to the customer…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: 'var(--muted, #64748b)' }}>
        The invoice PDF is attached automatically.
      </p>
    </Modal>
  );
}
