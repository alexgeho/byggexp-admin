import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Select, Space, Upload, message } from 'antd';
import { PaperClipOutlined, UploadOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import ScanButton from '@/src/features/purchases/components/ScanButton';
import { useAuthStore } from '@/src/store/authStore';
import { useExpenseStore } from '@/src/store/expenseStore';
import { getEntityId } from '@/src/utils/entityId';
import { resolveToolPhotoUrl } from '@/src/utils/toolPhotos';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({ onClose, expenseToEdit = null, lockedProjectId = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const [projects, setProjects] = useState([]);
  const [receiptUrl, setReceiptUrl] = useState(expenseToEdit?.receiptUrl || null);
  // For a not-yet-saved expense the scanned/attached receipt is stashed here and
  // uploaded right after the expense is created — so the file is never lost.
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  // Extra files besides the primary receipt: already-stored ones vs. new Files
  // waiting to upload once the expense is saved.
  const [existingExtras, setExistingExtras] = useState(expenseToEdit?.attachments || []);
  const [pendingExtras, setPendingExtras] = useState([]);
  const create = useExpenseStore((s) => s.create);
  const update = useExpenseStore((s) => s.update);
  const user = useAuthStore((s) => s.user);
  const amount = Form.useWatch('amount', form);
  const vat = Form.useWatch('vat', form);
  const exclVat = useMemo(() => (Number(amount) || 0) - (Number(vat) || 0), [amount, vat]);

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
  }, [user?.role]);

  useEffect(() => {
    if (expenseToEdit) {
      form.setFieldsValue({
        ...expenseToEdit,
        projectId: expenseToEdit.projectId || lockedProjectId || undefined,
      });
      setReceiptUrl(expenseToEdit.receiptUrl || null);
      setPendingFile(null);
      setExistingExtras(expenseToEdit.attachments || []);
      setPendingExtras([]);
      return;
    }
    setPendingFile(null);
    setExistingExtras([]);
    setPendingExtras([]);
    form.resetFields();
    form.setFieldsValue({
      date: today(),
      status: 'submitted',
      paidBy: 'own',
      amount: 0,
      vat: 0,
      projectId: lockedProjectId || undefined,
    });
    setReceiptUrl(null);
  }, [form, expenseToEdit, lockedProjectId]);

  // POST a receipt file to an existing expense.
  const sendReceipt = async (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await apiClient.post(`/expenses/${id}/receipt`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data?.receiptUrl || null;
  };

  // Attach right away when the expense exists; otherwise keep the file until the
  // expense is created (uploaded in onFinish).
  const attachOrStash = async (file) => {
    if (!expenseToEdit) {
      setPendingFile(file);
      setReceiptUrl(null);
      return;
    }
    setUploading(true);
    try {
      setReceiptUrl(await sendReceipt(getEntityId(expenseToEdit), file));
      message.success(t('Receipt uploaded'));
    } catch (err) {
      message.error(formatApiError(err, t('Failed to upload receipt')));
    } finally {
      setUploading(false);
    }
  };

  const applyScan = (data, file) => {
    if (file) void attachOrStash(file);
    if (!data) return;
    form.setFieldsValue({
      supplierName: data.supplierName || form.getFieldValue('supplierName'),
      category: data.category || form.getFieldValue('category'),
      date: data.date || form.getFieldValue('date'),
      amount: Number(data.total) || form.getFieldValue('amount') || 0,
      vat: Number(data.vat) || form.getFieldValue('vat') || 0,
    });
  };

  // Add extra files besides the primary receipt. Uploaded right away when the
  // expense exists; otherwise stashed until it is created (uploaded in onFinish).
  const addExtraFiles = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    if (!expenseToEdit) {
      setPendingExtras((prev) => [...prev, ...list]);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      list.forEach((f) => fd.append('files', f));
      const { data } = await apiClient.post(`/expenses/${getEntityId(expenseToEdit)}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setExistingExtras(data?.attachments || []);
    } catch (err) {
      message.error(formatApiError(err, t('Failed to upload receipt')));
    } finally {
      setUploading(false);
    }
  };

  const removeExistingExtra = async (url) => {
    if (!expenseToEdit) return;
    try {
      await apiClient.delete(`/expenses/${getEntityId(expenseToEdit)}/attachments`, { data: { url } });
      setExistingExtras((prev) => prev.filter((u) => u !== url));
    } catch (err) { message.error(formatApiError(err, t('Could not remove the file'))); }
  };

  const onFinish = async (values) => {
    const payload = {
      ...values,
      projectId: values.projectId || null,
      amount: Number(values.amount) || 0,
      vat: Number(values.vat) || 0,
    };
    try {
      const saved = expenseToEdit
        ? await update(getEntityId(expenseToEdit), payload)
        : await create(payload);
      // Upload the stashed receipt now that the new expense has an id.
      const savedId = getEntityId(saved) || (expenseToEdit ? getEntityId(expenseToEdit) : null);
      if (pendingFile && savedId) {
        try { await sendReceipt(savedId, pendingFile); } catch { message.warning(t('Expense saved, but the receipt could not be attached')); }
      }
      if (pendingExtras.length && savedId) {
        try {
          const fd = new FormData();
          pendingExtras.forEach((f) => fd.append('files', f));
          await apiClient.post(`/expenses/${savedId}/attachments`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch { message.warning(t('Expense saved, but the receipt could not be attached')); }
      }
      onClose?.();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, t('Failed to save expense')));
    }
  };

  return (
    <Form id="expense-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish}>
      <div style={{ marginBottom: 16 }}>
        <ScanButton onScanned={applyScan} label={t('Scan receipt')} />
      </div>
      <div className="invoice-form__grid">
        <Form.Item name="supplierName" label={t('Supplier')} rules={[{ required: true, message: t('Enter a supplier') }]}>
          <Input placeholder={t('e.g. Byggmax')} />
        </Form.Item>

        <Form.Item name="category" label={t('Category')}>
          <Input placeholder={t('e.g. Material, Drivmedel, Parkering')} />
        </Form.Item>

        {lockedProjectId ? (
          <Form.Item name="projectId" hidden><Input /></Form.Item>
        ) : (
          <Form.Item name="projectId" label={t('Project')}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t('Link to a project (optional)')}
              options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))}
            />
          </Form.Item>
        )}

        <Form.Item name="date" label={t('Date')}>
          <Input type="date" />
        </Form.Item>

        <Form.Item name="paidBy" label={t('Paid by')}>
          <Select
            options={[
              { value: 'own', label: t('Own money (reimburse)') },
              { value: 'company', label: t('Company card') },
            ]}
          />
        </Form.Item>

        <Form.Item name="status" label={t('Status')}>
          <Select
            options={[
              { value: 'submitted', label: t('Submitted') },
              { value: 'approved', label: t('Approved') },
              { value: 'rejected', label: t('Rejected') },
              { value: 'reimbursed', label: t('Reimbursed') },
            ]}
          />
        </Form.Item>

        <Form.Item name="amount" label={`${t('Total')} (SEK, ${t('incl. VAT')})`}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="vat" label={`${t('VAT')} (SEK)`}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label={`${t('Excl. VAT')} (SEK)`}>
          <InputNumber value={exclVat} precision={2} disabled style={{ width: '100%' }} />
        </Form.Item>
      </div>

      <Form.Item name="description" label={t('Description')}>
        <Input.TextArea rows={2} />
      </Form.Item>

      <Form.Item label={t('Receipt')}>
        {receiptUrl ? (
          <a href={resolveToolPhotoUrl(receiptUrl)} target="_blank" rel="noreferrer">
            <img
              src={resolveToolPhotoUrl(receiptUrl)}
              alt="kvitto"
              style={{ maxHeight: 120, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
          </a>
        ) : pendingFile ? (
          <div style={{ color: 'var(--muted, #64748b)', fontSize: 13, marginBottom: 8 }}>
            <PaperClipOutlined /> {pendingFile.name} — {t('will be saved with the expense')}
          </div>
        ) : (
          <div style={{ color: 'var(--muted, #64748b)', fontSize: 13, marginBottom: 8 }}>
            {t('No receipt attached')}
          </div>
        )}
        <Space wrap>
          <Upload
            accept="image/*,application/pdf"
            showUploadList={false}
            beforeUpload={(file) => { void attachOrStash(file); return false; }}
          >
            <Button icon={<UploadOutlined />} loading={uploading}>
              {receiptUrl || pendingFile ? t('Replace receipt') : t('Upload receipt')}
            </Button>
          </Upload>
          <Upload
            accept="image/*,application/pdf"
            showUploadList={false}
            multiple
            beforeUpload={(file, fileList) => {
              if (file === fileList[fileList.length - 1]) void addExtraFiles(fileList);
              return false;
            }}
          >
            <Button icon={<PaperClipOutlined />} loading={uploading}>{t('Attach file')}</Button>
          </Upload>
        </Space>
        {(existingExtras.length || pendingExtras.length) ? (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {existingExtras.map((url) => (
              <Space key={url} size={4}>
                <a href={resolveToolPhotoUrl(url)} target="_blank" rel="noreferrer">
                  <PaperClipOutlined /> {url.split('/').pop()}
                </a>
                <Button type="link" size="small" danger onClick={() => removeExistingExtra(url)}>{t('Remove')}</Button>
              </Space>
            ))}
            {pendingExtras.map((file, i) => (
              <Space key={`${file.name}-${i}`} size={4} style={{ color: 'var(--muted, #64748b)' }}>
                <PaperClipOutlined /> <span>{file.name}</span>
                <Button type="link" size="small" onClick={() => setPendingExtras((prev) => prev.filter((_, idx) => idx !== i))}>{t('Remove')}</Button>
              </Space>
            ))}
          </div>
        ) : null}
      </Form.Item>
    </Form>
  );
}
