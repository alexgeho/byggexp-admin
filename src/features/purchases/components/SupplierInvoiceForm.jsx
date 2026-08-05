import { useEffect, useMemo, useState } from 'react';
import { Form, Input, InputNumber, Select, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import ScanButton from '@/src/features/purchases/components/ScanButton';
import { useAuthStore } from '@/src/store/authStore';
import { useSupplierInvoiceStore } from '@/src/store/supplierInvoiceStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';

const STATUS_OPTIONS = [
  { value: 'registered', label: 'Registered' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function SupplierInvoiceForm({ onClose, invoiceToEdit = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const [projects, setProjects] = useState([]);
  const create = useSupplierInvoiceStore((s) => s.create);
  const update = useSupplierInvoiceStore((s) => s.update);
  const user = useAuthStore((s) => s.user);
  const excl = Form.useWatch('amountExclVat', form);
  const vat = Form.useWatch('vat', form);
  const total = useMemo(() => (Number(excl) || 0) + (Number(vat) || 0), [excl, vat]);

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
    if (invoiceToEdit) {
      form.setFieldsValue({
        ...invoiceToEdit,
        projectId: invoiceToEdit.projectId || undefined,
      });
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      invoiceDate: today(),
      status: 'registered',
      amountExclVat: 0,
      vat: 0,
    });
  }, [form, invoiceToEdit]);

  const applyScan = (data) => {
    if (!data) return;
    form.setFieldsValue({
      supplierName: data.supplierName || form.getFieldValue('supplierName'),
      supplierOrgNumber: data.supplierOrgNumber || form.getFieldValue('supplierOrgNumber'),
      invoiceNumber: data.invoiceNumber || form.getFieldValue('invoiceNumber'),
      invoiceDate: data.date || form.getFieldValue('invoiceDate'),
      dueDate: data.dueDate || form.getFieldValue('dueDate'),
      category: data.category || form.getFieldValue('category'),
      amountExclVat: Number(data.amountExclVat) || form.getFieldValue('amountExclVat') || 0,
      vat: Number(data.vat) || form.getFieldValue('vat') || 0,
    });
  };

  const onFinish = async (values) => {
    const payload = {
      ...values,
      projectId: values.projectId || null,
      amountExclVat: Number(values.amountExclVat) || 0,
      vat: Number(values.vat) || 0,
    };
    try {
      if (invoiceToEdit) {
        await update(getEntityId(invoiceToEdit), payload);
      } else {
        await create(payload);
      }
      onClose?.();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, t('Failed to save purchase invoice')));
    }
  };

  return (
    <Form id="supplier-invoice-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish}>
      <div style={{ marginBottom: 16 }}>
        <ScanButton onScanned={applyScan} label={t('Scan invoice')} />
      </div>
      <div className="invoice-form__grid">
        <Form.Item
          name="supplierName"
          label={t('Supplier')}
          rules={[{ required: true, message: t('Enter a supplier') }]}
        >
          <Input placeholder="t.ex. Beijer Bygg" />
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
          <Input placeholder={t('e.g. Material, Underentreprenör')} />
        </Form.Item>

        <Form.Item name="status" label={t('Status')}>
          <Select options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
        </Form.Item>

        <Form.Item name="amountExclVat" label={`${t('Excl. VAT')} (SEK)`}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="vat" label={`${t('VAT')} (SEK)`}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label={`${t('Total')} (SEK)`}>
          <InputNumber value={total} precision={2} disabled style={{ width: '100%' }} />
        </Form.Item>
      </div>

      <Form.Item name="notes" label={t('Notes')}>
        <Input.TextArea rows={2} />
      </Form.Item>
    </Form>
  );
}
