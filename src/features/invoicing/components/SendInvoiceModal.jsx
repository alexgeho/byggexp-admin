import { useEffect, useState } from 'react';
import { Input, Modal, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';
import { useAuthStore } from '@/src/store/authStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

// Modal to email an invoice PDF to the customer. `invoice` must already be saved
// (have an id); the PDF is attached server-side.
export default function SendInvoiceModal({ invoice, open, onClose, onSent }) {
  const t = useT();
  const companyId = useAuthStore((state) => state.user?.companyId) || 'default';
  // Saved default cover message, so it doesn't have to be retyped every send.
  const storageKey = `byggexp.invoiceEmailMessage.${companyId}`;
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(invoice?.email || '');
      let savedNote = '';
      try { savedNote = localStorage.getItem(storageKey) || ''; } catch { /* ignore */ }
      setNote(savedNote);
    }
  }, [open, invoice, storageKey]);

  const saveDefaultMessage = () => {
    const value = note.trim();
    try {
      if (value) {
        localStorage.setItem(storageKey, value);
        message.success(t('Saved as default message'));
      } else {
        localStorage.removeItem(storageKey);
        message.success(t('Default message cleared'));
      }
    } catch {
      message.error(t('Could not save the default message'));
    }
  };

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
      title={invoice?.invoiceNumber
        ? `${t('Send invoice by email')} · ${invoice.invoiceNumber}`
        : t('Send invoice by email')}
      open={open}
      onCancel={onClose}
      onOk={handleSend}
      okText={t('Send')}
      cancelText={t('Cancel')}
      confirmLoading={sending}
      destroyOnHidden
    >
      <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>{t('Recipient email')}</label>
      <Input
        type="email"
        placeholder="customer@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <label style={{ fontSize: 13 }}>{t('Message (optional)')}</label>
        <button
          type="button"
          onClick={saveDefaultMessage}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#0C77FD', fontSize: 12.5, fontWeight: 500 }}
        >
          {t('Save as default')}
        </button>
      </div>
      <Input.TextArea
        rows={3}
        placeholder="Add a short note to the customer…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: 'var(--muted, #64748b)' }}>
        {t('The invoice PDF is attached automatically.')} {t('Saved default text fills in automatically next time.')}
      </p>
    </Modal>
  );
}
