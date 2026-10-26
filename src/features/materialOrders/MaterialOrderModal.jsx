import { useEffect, useMemo, useRef, useState } from 'react';
import { AutoComplete, Form, Input, InputNumber, Select } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import { IconButton } from '@/src/ui-kit';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { GROSSISTS } from '@/src/features/articles/priceList/grossists';
import { addArticleRow, materialOrdersApi, rowsPayload } from './materialOrdersApi';

const dayStr = (d) => (d ? String(d).slice(0, 10) : '');

// Create / edit a draft Materialbeställning: supplier → pick articles from the
// register (filtered by supplier) → quantities, delivery address, date, comment.
export default function MaterialOrderModal({ open, order, project, suppliers, onClose, onSaved }) {
  const t = useT();
  const [form] = Form.useForm();
  const supplier = Form.useWatch('supplier', form);
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (!open) return;
    setRows(order?.rows?.map((r) => ({ ...r })) || []);
    form.setFieldsValue({
      supplier: order?.supplier || suppliers.find((s) => s.canOrder)?.supplier || suppliers[0]?.supplier || 'Lundagrossisten',
      deliveryAddress: order ? order.deliveryAddress : project?.location || '',
      desiredDate: dayStr(order?.desiredDate),
      comment: order?.comment || '',
    });
  }, [open, order, project, suppliers, form]);

  const search = async (q) => {
    const seq = ++searchSeq.current;
    try {
      const list = await materialOrdersApi.articles(supplier, q);
      if (seq === searchSeq.current) setOptions(list);
    } catch {
      if (seq === searchSeq.current) setOptions([]);
    }
  };

  useEffect(() => { if (open) void search(''); }, [open, supplier]); // eslint-disable-line react-hooks/exhaustive-deps

  const supplierOptions = useMemo(() => {
    const names = new Set([...suppliers.map((s) => s.supplier), ...GROSSISTS]);
    return [...names].map((value) => ({ value }));
  }, [suppliers]);

  const setQty = (i, quantity) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, quantity } : r)));

  const submit = async (values) => {
    setBusy(true);
    const body = { ...values, rows: rowsPayload(rows) };
    try {
      const saved = order
        ? await materialOrdersApi.update(order._id, body)
        : await materialOrdersApi.create({ ...body, projectId: project._id });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not save'));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { title: t('Art.no.'), dataIndex: 'articleNumber', key: 'nr', width: 120 },
    { title: t('Name'), dataIndex: 'name', key: 'name' },
    {
      title: t('Quantity'),
      key: 'qty',
      width: 150,
      render: (_, r, i) => (
        <InputNumber
          min={0}
          value={r.quantity}
          onChange={(v) => setQty(i, v)}
          addonAfter={r.unit || 'st'}
          style={{ width: 130 }}
        />
      ),
    },
    {
      key: 'del',
      width: 56,
      render: (_, r, i) => (
        <IconButton size="sm" variant="ghost" aria-label={t('Delete')} onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>
          <DeleteOutlined />
        </IconButton>
      ),
    },
  ];

  return (
    <AdminModal
      title={t('Material order')}
      open={open}
      onCancel={onClose}
      saveForm="material-order-form"
      saveDisabled={!rowsPayload(rows).length}
      saveLoading={busy}
      width={760}
      destroyOnHidden
    >
      <Form id="material-order-form" form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="supplier" label={t('Supplier')} rules={[{ required: true }]}>
          <AutoComplete options={supplierOptions} filterOption={(input, o) => o.value.toLowerCase().includes(input.toLowerCase())} />
        </Form.Item>
        <Form.Item label={t('Articles')}>
          <Select
            showSearch
            value={null}
            placeholder={t('Search article')}
            filterOption={false}
            onSearch={search}
            onSelect={(id) => {
              const a = options.find((o) => String(o._id) === String(id));
              if (a) setRows((rs) => addArticleRow(rs, a));
            }}
            options={options.map((a) => ({ value: String(a._id), label: `${a.articleNumber} · ${a.name}` }))}
          />
        </Form.Item>
        {rows.length > 0 && (
          <Table
            dataSource={rows}
            columns={columns}
            rowKey={(r, i) => r.articleId || `${r.articleNumber}-${i}`}
            pagination={false}
            size="small"
            style={{ marginBottom: 24 }}
          />
        )}
        <Form.Item name="deliveryAddress" label={t('Delivery address')}>
          <Input />
        </Form.Item>
        <Form.Item name="desiredDate" label={t('Desired date')}>
          <Input type="date" style={{ maxWidth: 220 }} />
        </Form.Item>
        <Form.Item name="comment" label={t('Comment')}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </AdminModal>
  );
}
