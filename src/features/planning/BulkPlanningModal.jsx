'use client';

import { useEffect, useState } from 'react';
import { Button, Input, InputNumber, Modal, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { usePlanningStore } from '@/src/store/planningStore';
import { useT } from '@/src/i18n/LanguageProvider';

let seq = 0;
const blankRow = () => ({ key: `r${seq++}`, name: '', dueDate: '', amount: null, ocr: '', bankgiro: '' });

// Add many manual planning entries at once (a batch of upcoming payments or
// expected receipts): an editable grid of rows, saved together.
export default function BulkPlanningModal({ open, direction, currency, onClose }) {
  const t = useT();
  const create = usePlanningStore((s) => s.create);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const isOut = direction === 'out';

  useEffect(() => {
    if (open) setRows([blankRow(), blankRow(), blankRow()]);
  }, [open]);

  const setField = (key, patch) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, blankRow()]);
  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  const ready = rows.filter((r) => (r.name || '').trim() || Number(r.amount) > 0);

  const saveAll = async () => {
    if (!ready.length) return;
    setSaving(true);
    let ok = 0;
    for (const r of ready) {
      try {
        await create({
          direction,
          name: r.name || '',
          dueDate: r.dueDate || '',
          amount: Number(r.amount) || 0,
          ocr: r.ocr || '',
          bankgiro: r.bankgiro || '',
        });
        ok += 1;
      } catch { /* store surfaces the error */ }
    }
    setSaving(false);
    message.success(`${ok}/${ready.length} ${t('added')}`);
    onClose?.(true);
  };

  const columns = [
    {
      title: isOut ? t('Supplier') : t('Customer'),
      key: 'name',
      render: (_, r) => <Input value={r.name} onChange={(e) => setField(r.key, { name: e.target.value })} />,
    },
    {
      title: t('Due date'),
      key: 'dueDate',
      width: 160,
      render: (_, r) => <Input type="date" value={r.dueDate} onChange={(e) => setField(r.key, { dueDate: e.target.value })} />,
    },
    {
      title: `${t('Amount')} (${currency})`,
      key: 'amount',
      width: 140,
      render: (_, r) => <InputNumber min={0} precision={2} value={r.amount} style={{ width: '100%' }} onChange={(v) => setField(r.key, { amount: v })} />,
    },
    ...(isOut ? [
      { title: t('OCR'), key: 'ocr', width: 150, render: (_, r) => <Input value={r.ocr} inputMode="numeric" onChange={(e) => setField(r.key, { ocr: e.target.value })} /> },
      { title: t('Bankgiro'), key: 'bankgiro', width: 120, render: (_, r) => <Input value={r.bankgiro} onChange={(e) => setField(r.key, { bankgiro: e.target.value })} /> },
    ] : []),
    { title: '', key: 'del', width: 40, render: (_, r) => <Button type="text" danger size="small" onClick={() => removeRow(r.key)}>✕</Button> },
  ];

  return (
    <Modal
      open={open}
      onCancel={() => onClose?.(false)}
      title={isOut ? t('Add upcoming payments') : t('Add expected receipts')}
      width={isOut ? 900 : 640}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={() => onClose?.(false)}>{t('Cancel')}</Button>,
        <Button key="save" type="primary" loading={saving} disabled={!ready.length} onClick={saveAll}>
          {t('Save all')} ({ready.length})
        </Button>,
      ]}
    >
      <Table dataSource={rows} columns={columns} rowKey="key" pagination={false} size="small" scroll={{ x: isOut ? 820 : 560 }} />
      <Button size="small" icon={<PlusOutlined />} onClick={addRow} style={{ marginTop: 12 }}>{t('Add row')}</Button>
    </Modal>
  );
}
