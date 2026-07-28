import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Select, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import ScanButton from '@/src/features/purchases/components/ScanButton';
import { useAuthStore } from '@/src/store/authStore';
import { useExpenseStore } from '@/src/store/expenseStore';
import { getEntityId } from '@/src/utils/entityId';
import { resolveToolPhotoUrl } from '@/src/utils/toolPhotos';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({ onClose, expenseToEdit = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const [projects, setProjects] = useState([]);
  const [receiptUrl, setReceiptUrl] = useState(expenseToEdit?.receiptUrl || null);
  const [uploading, setUploading] = useState(false);
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
        projectId: expenseToEdit.projectId || undefined,
      });
      setReceiptUrl(expenseToEdit.receiptUrl || null);
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      date: today(),
      status: 'submitted',
      paidBy: 'own',
      amount: 0,
      vat: 0,
    });
    setReceiptUrl(null);
  }, [form, expenseToEdit]);

  const uploadReceipt = async (file) => {
    if (!expenseToEdit) {
      message.info(t('Save the expense first, then attach a receipt'));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await apiClient.post(`/expenses/${getEntityId(expenseToEdit)}/receipt`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReceiptUrl(data?.receiptUrl || null);
      message.success(t('Receipt uploaded'));
    } catch (err) {
      message.error(formatApiError(err, 'Failed to upload receipt'));
    } finally {
      setUploading(false);
    }
  };

  const applyScan = (data) => {
    if (!data) return;
    form.setFieldsValue({
      supplierName: data.supplierName || form.getFieldValue('supplierName'),
      category: data.category || form.getFieldValue('category'),
      date: data.date || form.getFieldValue('date'),
      amount: Number(data.total) || form.getFieldValue('amount') || 0,
      vat: Number(data.vat) || form.getFieldValue('vat') || 0,
    });
  };

  const onFinish = async (values) => {
    const payload = {
      ...values,
      projectId: values.projectId || null,
      amount: Number(values.amount) || 0,
      vat: Number(values.vat) || 0,
    };
    try {
      if (expenseToEdit) {
        await update(getEntityId(expenseToEdit), payload);
      } else {
        await create(payload);
      }
      onClose?.();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, 'Failed to save expense'));
    }
  };

  return (
    <Form id="expense-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish}>
      <div style={{ marginBottom: 16 }}>
        <ScanButton onScanned={applyScan} label={t('Scan receipt')} />
      </div>
      <div className="invoice-form__grid">
        <Form.Item name="supplierName" label={t('Supplier')} rules={[{ required: true, message: t('Enter a supplier') }]}>
          <Input placeholder="t.ex. Byggmax" />
        </Form.Item>

        <Form.Item name="category" label={t('Category')}>
          <Input placeholder={t('e.g. Material, Drivmedel, Parkering')} />
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
        ) : (
          <div style={{ color: 'var(--muted, #64748b)', fontSize: 13, marginBottom: 8 }}>
            {t('No receipt attached')}
          </div>
        )}
        <Upload
          accept="image/*,application/pdf"
          showUploadList={false}
          beforeUpload={(file) => { void uploadReceipt(file); return false; }}
        >
          <Button icon={<UploadOutlined />} loading={uploading} disabled={!expenseToEdit}>
            {receiptUrl ? t('Replace receipt') : t('Upload receipt')}
          </Button>
        </Upload>
      </Form.Item>
    </Form>
  );
}
