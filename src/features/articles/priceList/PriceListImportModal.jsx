import { useState } from 'react';
import { AutoComplete, Form, InputNumber, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { parsePriceList } from '@/src/features/articles/priceList/parsePriceList';

const { Dragger } = Upload;

const GROSSISTS = ['Ahlsell', 'Dahl', 'Rexel', 'Sonepar', 'Elektroskandia', 'Solar', 'Onninen', 'Beijer', 'Bevego', 'Lundagrossisten', 'Würth']
  .map((value) => ({ value }));

const CHUNK = 2000;

// Grossist price list (Excel/CSV) → material articles. Same supplier + article
// number updates the price; påslag turns the net price into the sales price.
export default function PriceListImportModal({ open, onClose, onDone }) {
  const t = useT();
  const [form] = Form.useForm();
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const pickFile = async (picked) => {
    setFile(picked);
    const { rows: parsed, error } = await parsePriceList(picked);
    setRows(parsed);
    if (error) appMessage.error(t('No article number and price columns found in the file'));
    if (!form.getFieldValue('supplier')) {
      const guess = GROSSISTS.find((g) => picked.name.toLowerCase().includes(g.value.toLowerCase()));
      if (guess) form.setFieldsValue({ supplier: guess.value });
    }
  };

  const submit = async ({ supplier, markupPercent }) => {
    setBusy(true);
    let created = 0;
    let updated = 0;
    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { data } = await apiClient.post('/articles/import', {
          supplier, markupPercent: markupPercent || 0, rows: rows.slice(i, i + CHUNK),
        });
        created += data.created;
        updated += data.updated;
      }
      appMessage.success(`${t('New')}: ${created} · ${t('Updated')}: ${updated}`);
      setFile(null);
      setRows([]);
      form.resetFields();
      onDone?.();
      onClose();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Import failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminModal
      title={t('Import price list')}
      open={open}
      onCancel={onClose}
      saveForm="price-list-import-form"
      saveText={t('Import')}
      saveDisabled={!rows.length}
      saveLoading={busy}
      width={560}
      destroyOnHidden
    >
      <Form
        id="price-list-import-form"
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{ markupPercent: 20 }}
      >
        <Form.Item>
          <Dragger
            accept=".xlsx,.xls,.csv"
            showUploadList={false}
            beforeUpload={(picked) => { pickFile(picked); return false; }}
          >
            <p style={{ margin: 0 }}><InboxOutlined style={{ fontSize: 28, color: 'var(--color-primary, #2394FF)' }} /></p>
            <p style={{ margin: '8px 0 0' }}>
              {file ? `${file.name} · ${rows.length} ${t('articles')}` : t('Excel or CSV from the grossist')}
            </p>
          </Dragger>
        </Form.Item>
        <Form.Item name="supplier" label={t('Grossist')} rules={[{ required: true, message: t('Required') }]}>
          <AutoComplete options={GROSSISTS} filterOption />
        </Form.Item>
        <Form.Item name="markupPercent" label={t('Markup %')}>
          <InputNumber min={0} max={1000} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </AdminModal>
  );
}
