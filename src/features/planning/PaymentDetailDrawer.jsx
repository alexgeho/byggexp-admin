'use client';

import { useState } from 'react';
import { Button, Drawer, Space, Tag, Typography } from 'antd';
import { CheckOutlined, CopyOutlined, FileTextOutlined, MailOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useT } from '@/src/i18n/LanguageProvider';
import { appMessage } from '@/src/utils/appMessage';
import { formatMoney } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { resolveUrl } from '@/src/utils/resolveUrl';
import { getEntityId } from '@/src/utils/entityId';
import { cleanOcr } from '@/src/features/planning/planningUtils';

const TONE_TAG = {
  overdue: { color: 'red', label: 'Overdue' },
  soon: { color: 'orange', label: 'Due soon' },
};

// A single labelled row; when `copy` is set the value gets a copy button that
// puts `copy` on the clipboard — this is the whole point on the payables side,
// where the admin copies OCR + bankgiro straight into their bank.
function Row({ label, value, copy, copyMsg }) {
  const t = useT();
  if (value == null || value === '') return null;
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(copy));
      appMessage.success(copyMsg || t('Copied'));
    } catch {
      appMessage.error(t('Could not copy'));
    }
  };
  return (
    <div className="payment-drawer__row">
      <span className="payment-drawer__label">{label}</span>
      <span className="payment-drawer__value">
        {value}
        {copy ? (
          <Button type="text" size="small" icon={<CopyOutlined />} onClick={doCopy} aria-label={t('Copy')} />
        ) : null}
      </span>
    </div>
  );
}

export default function PaymentDetailDrawer({ open, record, currency, onClose, onMarkPaid, onSendReminder, invoicesLink }) {
  const t = useT();
  const [reminding, setReminding] = useState(false);
  if (!record) return <Drawer open={open} onClose={onClose} width={440} />;

  const isAp = record._kind === 'ap';
  const tone = TONE_TAG[record._tone];
  const attachment = resolveUrl(record.attachmentUrl);
  const ocrDigits = cleanOcr(record.ocr);
  const total = isAp ? record.total : (record.roundedTotal ?? record.total);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={460}
      title={isAp ? t('Invoice to pay') : t('Invoice to collect')}
      className="payment-drawer"
      extra={tone ? <Tag color={tone.color}>{t(tone.label)}</Tag> : null}
      footer={isAp ? (
        <Space>
          {String(record.status) !== 'paid' ? (
            <Button type="primary" icon={<CheckOutlined />} onClick={() => onMarkPaid?.(getEntityId(record))}>
              {t('Mark as paid')}
            </Button>
          ) : null}
          {attachment ? (
            <Button icon={<FileTextOutlined />} href={attachment} target="_blank" rel="noopener">
              {t('Open document')}
            </Button>
          ) : null}
        </Space>
      ) : (
        <Space>
          {onSendReminder && record._tone === 'overdue' ? (
            <Button
              type="primary"
              icon={<MailOutlined />}
              loading={reminding}
              onClick={async () => {
                setReminding(true);
                try { await onSendReminder(getEntityId(record)); } finally { setReminding(false); }
              }}
            >
              {t('Send reminder')}
            </Button>
          ) : null}
          {invoicesLink ? (
            <Link href={invoicesLink}>
              <Button>{t('Open in Invoices')}</Button>
            </Link>
          ) : null}
        </Space>
      )}
    >
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {isAp ? (record.supplierName || '—') : (record.companyName || record.clientName || '—')}
      </Typography.Title>
      <div className="payment-drawer__amount">{formatMoney(total, currency)}</div>

      <div className="payment-drawer__rows">
        <Row label={t('Due date')} value={record.dueDate ? formatAdminDate(record.dueDate) : '—'} />
        <Row
          label={t('Days')}
          value={record._days == null ? '—'
            : record._days < 0 ? `${Math.abs(record._days)} ${t('days overdue')}`
              : record._days === 0 ? t('Due today')
                : `${record._days} ${t('days left')}`}
        />
        <Row label={t('Invoice no.')} value={record.invoiceNumber || '—'} />
        {isAp ? (
          <>
            <Row label={t('Org no.')} value={record.supplierOrgNumber} />
            <Row label={t('Invoice date')} value={record.invoiceDate ? formatAdminDate(record.invoiceDate) : null} />
            <Row label={t('Category')} value={record.category} />
            <Row
              label={t('OCR reference')}
              value={record.ocr || '—'}
              copy={ocrDigits || null}
              copyMsg={t('OCR reference copied')}
            />
            <Row label={t('Bankgiro')} value={record.bankgiro} copy={record.bankgiro} copyMsg={t('Bankgiro copied')} />
            <Row label={t('Plusgiro')} value={record.plusgiro} copy={record.plusgiro} copyMsg={t('Plusgiro copied')} />
            <Row label={`${t('Excl. VAT')}`} value={formatMoney(record.amountExclVat, currency)} />
            <Row label={t('VAT')} value={formatMoney(record.vat, currency)} />
            <Row label={t('Notes')} value={record.notes} />
          </>
        ) : (
          <>
            <Row label={t('Date')} value={record.date ? formatAdminDate(record.date) : null} />
            <Row
              label={t('OCR reference')}
              value={record.ocr || '—'}
              copy={cleanOcr(record.ocr) || null}
              copyMsg={t('OCR reference copied')}
            />
            <Row label={t('Status')} value={t(String(record.status || ''))} />
            <Row
              label={t('Reminders sent')}
              value={record.reminderCount
                ? `${record.reminderCount}${record.lastReminderAt ? ` · ${formatAdminDate(record.lastReminderAt)}` : ''}`
                : null}
            />
          </>
        )}
      </div>
    </Drawer>
  );
}
