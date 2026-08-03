import { useEffect, useState } from 'react';
import { Button, Input, InputNumber, Modal, Select, Table, Tag, Upload, message } from 'antd';
import { InboxOutlined, ScanOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useSupplierInvoiceStore } from '@/src/store/supplierInvoiceStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';

const { Dragger } = Upload;

// Bulk-scan supplier invoices: each file → /scan → editable row → saved as a
// supplier invoice, all linked to a shared project.
export default function BulkScanInvoiceModal({ open, onClose }) {
  const t = useT();
  const create = useSupplierInvoiceStore((s) => s.create);
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows([]);
    setProjectId(null);
    apiClient
      .get(user?.role === 'superadmin' ? '/projects' : '/projects/my')
      .then(({ data }) => setProjects(data || []))
      .catch(() => setProjects([]));
  }, [open, user?.role]);

  const scanOne = async (file, key) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await apiClient.post('/scan', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRows((prev) => prev.map((r) => (r.key === key ? {
        ...r,
        status: 'done',
        supplierName: data.supplierName || '',
        supplierOrgNumber: data.supplierOrgNumber || '',
        invoiceNumber: data.invoiceNumber || '',
        invoiceDate: data.date || '',
        dueDate: data.dueDate || '',
        category: data.category || '',
        amountExclVat: Number(data.amountExclVat) || 0,
        vat: Number(data.vat) || 0,
      } : r)));
    } catch {
      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, status: 'error' } : r)));
    }
  };

  const onFiles = (fileList) => {
    const startIndex = rows.length;
    const added = fileList.map((file, i) => ({
      key: `${startIndex + i}-${file.name}`,
      status: 'scanning',
      supplierName: '', supplierOrgNumber: '', invoiceNumber: '',
      invoiceDate: '', dueDate: '', category: '', amountExclVat: 0, vat: 0,
    }));
    setRows((prev) => [...prev, ...added]);
    added.forEach((r, i) => scanOne(fileList[i], r.key));
  };

  const setField = (key, patch) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  const ready = rows.filter((r) => r.status === 'done');
  const scanning = rows.some((r) => r.status === 'scanning');

  const saveAll = async () => {
    if (!ready.length) return;
    setSaving(true);
    let ok = 0;
    for (const r of ready) {
      try {
        await create({
          supplierName: r.supplierName,
          supplierOrgNumber: r.supplierOrgNumber,
          invoiceNumber: r.invoiceNumber,
          invoiceDate: r.invoiceDate,
          dueDate: r.dueDate,
          category: r.category,
          amountExclVat: Number(r.amountExclVat) || 0,
          vat: Number(r.vat) || 0,
          status: 'registered',
          projectId: projectId || null,
        });
        ok += 1;
      } catch { /* store surfaces the error */ }
    }
    setSaving(false);
    message.success(`${ok}/${ready.length} ${t('purchase invoices saved')}`);
    onClose?.(true);
  };

  const editText = (field, r, placeholder) => (r.status === 'done'
    ? <Input value={r[field]} placeholder={placeholder} onChange={(e) => setField(r.key, { [field]: e.target.value })} />
    : <Tag color={r.status === 'error' ? 'error' : 'processing'}>{r.status === 'error' ? t('Failed') : t('Scanning…')}</Tag>);
  const editNum = (field, r) => (r.status === 'done'
    ? <InputNumber min={0} precision={2} value={r[field]} style={{ width: '100%' }} onChange={(val) => setField(r.key, { [field]: val || 0 })} /> : null);
  const editDate = (field, r) => (r.status === 'done'
    ? <Input type="date" value={r[field]} onChange={(e) => setField(r.key, { [field]: e.target.value })} /> : null);

  const columns = [
    { title: t('Supplier'), key: 'supplierName', render: (_, r) => editText('supplierName', r), width: 170 },
    { title: t('Invoice no.'), key: 'invoiceNumber', render: (_, r) => editText('invoiceNumber', r), width: 130 },
    { title: t('Invoice date'), key: 'invoiceDate', render: (_, r) => editDate('invoiceDate', r), width: 150 },
    { title: t('Due date'), key: 'dueDate', render: (_, r) => editDate('dueDate', r), width: 150 },
    { title: t('Category'), key: 'category', render: (_, r) => editText('category', r), width: 140 },
    { title: `${t('Excl. VAT')}`, key: 'amountExclVat', render: (_, r) => editNum('amountExclVat', r), width: 110 },
    { title: `${t('VAT')}`, key: 'vat', render: (_, r) => editNum('vat', r), width: 100 },
    { title: '', key: 'remove', width: 40, render: (_, r) => <Button type="text" danger size="small" onClick={() => removeRow(r.key)}>✕</Button> },
  ];

  return (
    <Modal
      open={open}
      onCancel={() => onClose?.(false)}
      title={t('Scan multiple invoices')}
      width={1080}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={() => onClose?.(false)}>{t('Cancel')}</Button>,
        <Button key="save" type="primary" loading={saving} disabled={!ready.length || scanning} onClick={saveAll}>
          {t('Save all')} ({ready.length})
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16, maxWidth: 360 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>{t('Project')}</label>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          placeholder={t('Link to a project (optional)')}
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))}
        />
      </div>

      <Dragger
        accept="image/*,application/pdf"
        multiple
        showUploadList={false}
        beforeUpload={(_file, fileList) => { onFiles(fileList); return false; }}
        style={{ marginBottom: 16 }}
      >
        <p style={{ margin: 0 }}><InboxOutlined style={{ fontSize: 28, color: '#0785F4' }} /></p>
        <p style={{ margin: '8px 0 0' }}>{t('Drop invoice photos or PDFs here, or click to choose')}</p>
        <p style={{ margin: 0, color: 'var(--muted, #64748b)', fontSize: 12 }}>{t('Each file is scanned automatically')}</p>
      </Dragger>

      {rows.length ? (
        <Table dataSource={rows} columns={columns} rowKey="key" pagination={false} size="small" scroll={{ x: 900, y: 320 }} />
      ) : null}

      {rows.length ? (
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted, #64748b)' }}>
          <ScanOutlined /> {scanning ? t('Scanning…') : `${ready.length} ${t('ready to save')}`}
        </p>
      ) : null}
    </Modal>
  );
}
