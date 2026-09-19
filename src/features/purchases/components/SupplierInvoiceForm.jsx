import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Select, Space, message } from 'antd';
import { DownloadOutlined, PaperClipOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import ScanButton from '@/src/features/purchases/components/ScanButton';
import { useAuthStore } from '@/src/store/authStore';
import { useSupplierInvoiceStore } from '@/src/store/supplierInvoiceStore';
import { getEntityId } from '@/src/utils/entityId';
import { resolveUrl } from '@/src/utils/resolveUrl';
import { findDuplicateInvoice } from '@/src/features/purchases/duplicateInvoice';
import { useT } from '@/src/i18n/LanguageProvider';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { formatApiError } from '@/src/utils/formError';

const STATUS_OPTIONS = [
  { value: 'registered', label: 'Registered' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

// Currencies offered in the picker. The scan may still fill in another ISO code
// (it is kept as a free option), but these cover the app's markets + EUR/USD.
const CURRENCY_OPTIONS = ['SEK', 'EUR', 'NOK', 'DKK', 'USD'];

const today = () => new Date().toISOString().slice(0, 10);

export default function SupplierInvoiceForm({ onClose, invoiceToEdit = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const [projects, setProjects] = useState([]);
  // The original scanned/uploaded document. `attachmentFile` is a pending File
  // to upload after save; `existingUrl` is the already-stored attachment (edit).
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [existingUrl, setExistingUrl] = useState('');
  // Extra files: `existingExtras` are already stored on the invoice (edit mode);
  // `pendingExtras` are new Files waiting to upload once the invoice is saved.
  const [existingExtras, setExistingExtras] = useState([]);
  const [pendingExtras, setPendingExtras] = useState([]);
  const create = useSupplierInvoiceStore((s) => s.create);
  const update = useSupplierInvoiceStore((s) => s.update);
  const existing = useSupplierInvoiceStore((s) => s.invoices);
  const fetchAll = useSupplierInvoiceStore((s) => s.fetchAll);
  const user = useAuthStore((s) => s.user);
  const companyCurrency = useCompanyCurrency();
  const excl = Form.useWatch('amountExclVat', form);
  const vat = Form.useWatch('vat', form);
  const currency = Form.useWatch('currency', form) || companyCurrency;
  const currencyOptions = useMemo(
    () => Array.from(new Set([...CURRENCY_OPTIONS, companyCurrency, currency]))
      .filter(Boolean)
      .map((c) => ({ value: c, label: c })),
    [companyCurrency, currency],
  );
  const supplierName = Form.useWatch('supplierName', form);
  const invoiceNumber = Form.useWatch('invoiceNumber', form);
  const invoiceDate = Form.useWatch('invoiceDate', form);
  const ocr = Form.useWatch('ocr', form);
  const total = useMemo(() => (Number(excl) || 0) + (Number(vat) || 0), [excl, vat]);

  // Warn (never block) when the entered invoice looks like one already captured.
  const duplicate = useMemo(
    () => findDuplicateInvoice(
      { supplierName, invoiceNumber, invoiceDate, ocr, total },
      existing,
      invoiceToEdit ? getEntityId(invoiceToEdit) : null,
    ),
    [supplierName, invoiceNumber, invoiceDate, ocr, total, existing, invoiceToEdit],
  );

  useEffect(() => {
    const load = async () => {
      const url = user?.role === 'superadmin' ? '/projects' : '/projects/my';
      try {
        const { data } = await apiClient.get(url);
        setProjects(data || []);
      } catch {
        setProjects([]);
      }
    };
    load();
    if (!existing.length) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  useEffect(() => {
    setAttachmentFile(null);
    setPendingExtras([]);
    if (invoiceToEdit) {
      setExistingUrl(invoiceToEdit.attachmentUrl || '');
      setExistingExtras(invoiceToEdit.attachments || []);
      form.setFieldsValue({
        ...invoiceToEdit,
        projectId: invoiceToEdit.projectId || undefined,
      });
      return;
    }
    setExistingUrl('');
    setExistingExtras([]);
    form.resetFields();
    form.setFieldsValue({
      invoiceDate: today(),
      status: 'registered',
      currency: companyCurrency,
      amountExclVat: 0,
      vat: 0,
    });
  }, [form, invoiceToEdit, companyCurrency]);

  // Scanning also hands back the raw file so we can store the original document,
  // not just the extracted fields.
  const applyScan = (data, file) => {
    if (file) setAttachmentFile(file);
    if (!data) return;
    form.setFieldsValue({
      supplierName: data.supplierName || form.getFieldValue('supplierName'),
      supplierOrgNumber: data.supplierOrgNumber || form.getFieldValue('supplierOrgNumber'),
      invoiceNumber: data.invoiceNumber || form.getFieldValue('invoiceNumber'),
      invoiceDate: data.date || form.getFieldValue('invoiceDate'),
      dueDate: data.dueDate || form.getFieldValue('dueDate'),
      category: data.category || form.getFieldValue('category'),
      ocr: data.ocr || form.getFieldValue('ocr'),
      bankgiro: data.bankgiro || form.getFieldValue('bankgiro'),
      plusgiro: data.plusgiro || form.getFieldValue('plusgiro'),
      iban: data.iban || form.getFieldValue('iban'),
      bic: data.bic || form.getFieldValue('bic'),
      currency: data.currency || form.getFieldValue('currency') || companyCurrency,
      amountExclVat: Number(data.amountExclVat) || form.getFieldValue('amountExclVat') || 0,
      vat: Number(data.vat) || form.getFieldValue('vat') || 0,
    });
  };

  // Remove an already-stored extra file from the invoice (immediate on the API).
  const removeExistingExtra = async (url) => {
    if (!invoiceToEdit) return;
    try {
      await apiClient.delete(`/supplier-invoices/${getEntityId(invoiceToEdit)}/attachments`, {
        data: { url },
      });
      setExistingExtras((prev) => prev.filter((u) => u !== url));
      await fetchAll();
    } catch { message.error(t('Could not remove the file')); }
  };

  const onFinish = async (values) => {
    const payload = {
      ...values,
      projectId: values.projectId || null,
      amountExclVat: Number(values.amountExclVat) || 0,
      vat: Number(values.vat) || 0,
    };
    try {
      const saved = invoiceToEdit
        ? await update(getEntityId(invoiceToEdit), payload)
        : await create(payload);
      // Persist the original document (scanned or manually attached) so it can be
      // reopened/downloaded later. Best-effort: the invoice is saved regardless.
      const savedId = getEntityId(saved) || (invoiceToEdit ? getEntityId(invoiceToEdit) : null);
      if (attachmentFile && savedId) {
        try {
          const fd = new FormData();
          fd.append('file', attachmentFile);
          await apiClient.post(`/supplier-invoices/${savedId}/attachment`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch { message.warning(t('Invoice saved, but the file could not be attached')); }
      }
      // Upload any extra files now that the invoice has an id.
      if (pendingExtras.length && savedId) {
        try {
          const fd = new FormData();
          pendingExtras.forEach((f) => fd.append('files', f));
          await apiClient.post(`/supplier-invoices/${savedId}/attachments`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch { message.warning(t('Invoice saved, but the file could not be attached')); }
      }
      if ((attachmentFile || pendingExtras.length) && savedId) await fetchAll();
      onClose?.();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, t('Failed to save purchase invoice')));
    }
  };

  return (
    <Form id="supplier-invoice-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish}>
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <ScanButton onScanned={applyScan} label={t('Scan invoice')} />
      </div>
      {(attachmentFile || existingUrl || existingExtras.length || pendingExtras.length) ? (
        <div className="invoice-form__files" style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachmentFile ? (
            <Space size={4} style={{ color: 'var(--muted, #64748b)' }}>
              <PaperClipOutlined />
              <span>{attachmentFile.name}</span>
              <Button type="link" size="small" onClick={() => setAttachmentFile(null)}>{t('Remove')}</Button>
            </Space>
          ) : existingUrl ? (
            <Space size={4}>
              <Button type="link" icon={<DownloadOutlined />} href={resolveUrl(existingUrl)} target="_blank" rel="noopener" style={{ paddingLeft: 0 }}>
                {t('Open original')}
              </Button>
              {invoiceToEdit ? (
                <Button type="link" size="small" danger onClick={() => removeExistingExtra(existingUrl)}>{t('Remove')}</Button>
              ) : null}
            </Space>
          ) : null}
          {existingExtras.map((url) => (
            <Space key={url} size={4}>
              <Button type="link" icon={<DownloadOutlined />} href={resolveUrl(url)} target="_blank" rel="noopener" style={{ paddingLeft: 0 }}>
                {url.split('/').pop()}
              </Button>
              <Button type="link" size="small" danger onClick={() => removeExistingExtra(url)}>{t('Remove')}</Button>
            </Space>
          ))}
          {pendingExtras.map((file, i) => (
            <Space key={`${file.name}-${i}`} size={4} style={{ color: 'var(--muted, #64748b)' }}>
              <PaperClipOutlined />
              <span>{file.name}</span>
              <Button
                type="link"
                size="small"
                onClick={() => setPendingExtras((prev) => prev.filter((_, idx) => idx !== i))}
              >
                {t('Remove')}
              </Button>
            </Space>
          ))}
        </div>
      ) : null}
      {duplicate ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={t('Possible duplicate')}
          description={`${t('An invoice from this supplier already exists')}${duplicate.invoiceNumber ? ` (#${duplicate.invoiceNumber})` : ''}.`}
        />
      ) : null}
      <div className="invoice-form__grid">
        <Form.Item
          name="supplierName"
          label={t('Supplier')}
          rules={[{ required: true, message: t('Enter a supplier') }]}
        >
          <Input placeholder={t('e.g. Beijer Bygg')} />
        </Form.Item>

        <Form.Item name="supplierOrgNumber" label={t('Org no.')}>
          <Input placeholder="556000-0000" />
        </Form.Item>

        <Form.Item name="invoiceNumber" label={t('Invoice no.')}>
          <Input />
        </Form.Item>

        <Form.Item name="projectId" label={t('Project')}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t('Link to a project (optional)')}
            options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))}
          />
        </Form.Item>

        <Form.Item name="invoiceDate" label={t('Invoice date')}>
          <Input type="date" />
        </Form.Item>

        <Form.Item name="dueDate" label={t('Due date')}>
          <Input type="date" />
        </Form.Item>

        <Form.Item name="category" label={t('Category')}>
          <Input placeholder={t('e.g. Material, Subcontractor')} />
        </Form.Item>

        <Form.Item name="ocr" label={t('OCR reference')}>
          <Input placeholder={t('Payment reference')} inputMode="numeric" />
        </Form.Item>

        <Form.Item name="bankgiro" label={t('Bankgiro')}>
          <Input placeholder="123-4567" />
        </Form.Item>

        <Form.Item name="plusgiro" label={t('Plusgiro')}>
          <Input placeholder="12 34 56-7" />
        </Form.Item>

        <Form.Item name="iban" label={t('IBAN')}>
          <Input placeholder="SE00 0000 0000 0000 0000 0000" />
        </Form.Item>

        <Form.Item name="bic" label={t('BIC')}>
          <Input placeholder="NDEASESS" />
        </Form.Item>

        <Form.Item name="currency" label={t('Currency')}>
          <Select showSearch options={currencyOptions} />
        </Form.Item>

        <Form.Item name="status" label={t('Status')}>
          <Select options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
        </Form.Item>

        <Form.Item name="amountExclVat" label={`${t('Excl. VAT')} (${currency})`}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="vat" label={`${t('VAT')} (${currency})`}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label={`${t('Total')} (${currency})`}>
          <InputNumber value={total} precision={2} disabled style={{ width: '100%' }} />
        </Form.Item>
      </div>

      <Form.Item name="notes" label={t('Notes')}>
        <Input.TextArea rows={2} />
      </Form.Item>
    </Form>
  );
}
