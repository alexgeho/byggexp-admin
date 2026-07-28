import { useEffect, useMemo, useState } from 'react';
import { Button, Input, InputNumber, Modal, Select, Table, Tag, Upload, message } from 'antd';
import { InboxOutlined, ScanOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useExpenseStore } from '@/src/store/expenseStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';

const { Dragger } = Upload;

// Scan a batch of receipt photos/PDFs at once: each file is sent to /scan, the
// extracted rows are shown in an editable table, then saved as expenses in one
// go (all linked to the same project / paid-by).
export default function BulkScanModal({ open, onClose }) {
  const t = useT();
  const create = useExpenseStore((s) => s.create);
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]); // {key, name, status, supplierName, category, date, amount, vat}
  const [projectId, setProjectId] = useState(null);
  const [paidBy, setPaidBy] = useState('own');
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
        category: data.category || '',
        date: data.date || '',
        amount: Number(data.total) || 0,
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
      name: file.name,
      status: 'scanning',
      supplierName: '',
      category: '',
      date: '',
      amount: 0,
      vat: 0,
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
          category: r.category,
          date: r.date,
          amount: Number(r.amount) || 0,
          vat: Number(r.vat) || 0,
          paidBy,
          projectId: projectId || null,
        });
        ok += 1;
      } catch { /* store surfaces the error */ }
    }
    setSaving(false);
    message.success(`${ok}/${ready.length} ${t('expenses saved')}`);
    onClose?.(true);
  };

  const columns = useMemo(() => [
    {
      title: t('Supplier'),
      dataIndex: 'supplierName',
      key: 'supplierName',
      render: (v, r) => (r.status === 'done'
        ? <Input value={v} onChange={(e) => setField(r.key, { supplierName: e.target.value })} />
        : <Tag color={r.status === 'error' ? 'error' : 'processing'}>{r.status === 'error' ? t('Failed') : t('Scanning…')}</Tag>),
    },
    {
      title: t('Category'),
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (v, r) => (r.status === 'done'
        ? <Input value={v} onChange={(e) => setField(r.key, { category: e.target.value })} /> : null),
    },
    {
      title: t('Date'),
      dataIndex: 'date',
      key: 'date',
      width: 150,
      render: (v, r) => (r.status === 'done'
        ? <Input type="date" value={v} onChange={(e) => setField(r.key, { date: e.target.value })} /> : null),
    },
    {
      title: `${t('Total')} (SEK)`,
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (v, r) => (r.status === 'done'
        ? <InputNumber min={0} precision={2} value={v} style={{ width: '100%' }} onChange={(val) => setField(r.key, { amount: val || 0 })} /> : null),
    },
    {
      title: `${t('VAT')}`,
      dataIndex: 'vat',
      key: 'vat',
      width: 110,
      render: (v, r) => (r.status === 'done'
        ? <InputNumber min={0} precision={2} value={v} style={{ width: '100%' }} onChange={(val) => setField(r.key, { vat: val || 0 })} /> : null),
    },
    {
      title: '',
      key: 'remove',
      width: 40,
      render: (_, r) => <Button type="text" danger size="small" onClick={() => removeRow(r.key)}>✕</Button>,
    },
  ], [t]);

  return (
    <Modal
      open={open}
      onCancel={() => onClose?.(false)}
      title={t('Scan multiple receipts')}
      width={960}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={() => onClose?.(false)}>{t('Cancel')}</Button>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          disabled={!ready.length || scanning}
          onClick={saveAll}
        >
          {t('Save all')} ({ready.length})
        </Button>,
      ]}
    >
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 260, flex: 1 }}>
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
        <div style={{ minWidth: 200 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>{t('Paid by')}</label>
          <Select
            style={{ width: '100%' }}
            value={paidBy}
            onChange={setPaidBy}
            options={[
              { value: 'own', label: t('Own money (reimburse)') },
              { value: 'company', label: t('Company card') },
            ]}
          />
        </div>
      </div>

      <Dragger
        accept="image/*,application/pdf"
        multiple
        showUploadList={false}
        beforeUpload={(_file, fileList) => { onFiles(fileList); return false; }}
        style={{ marginBottom: 16 }}
      >
        <p style={{ margin: 0 }}><InboxOutlined style={{ fontSize: 28, color: '#0785F4' }} /></p>
        <p style={{ margin: '8px 0 0' }}>{t('Drop receipt photos or PDFs here, or click to choose')}</p>
        <p style={{ margin: 0, color: 'var(--muted, #64748b)', fontSize: 12 }}>{t('Each file is scanned automatically')}</p>
      </Dragger>

      {rows.length ? (
        <Table
          dataSource={rows}
          columns={columns}
          rowKey="key"
          pagination={false}
          size="small"
          scroll={{ x: 720, y: 320 }}
        />
      ) : null}

      {rows.length ? (
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted, #64748b)' }}>
          <ScanOutlined /> {scanning ? t('Scanning…') : `${ready.length} ${t('ready to save')}`}
        </p>
      ) : null}
    </Modal>
  );
}
