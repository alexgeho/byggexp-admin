import { useState } from 'react';
import { Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';
import { parseDiscountLetter } from '@/src/features/articles/priceList/parsePriceList';
import { materialOrdersApi } from './materialOrdersApi';

// Rabattbrev: the company's discount per rabattgrupp at one grossist, uploaded
// about once a year. Saving replaces the old one and reprices the articles.
export default function DiscountLetterModal({ supplier, onClose, onDone }) {
  const t = useT();
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const pick = async (picked) => {
    setFile(picked);
    const { rows: parsed, error } = await parseDiscountLetter(picked);
    setRows(parsed);
    if (error) appMessage.error(t('No rabattgrupp and discount columns found in the file'));
  };

  const close = () => {
    setFile(null);
    setRows([]);
    onClose();
  };

  const save = async () => {
    setBusy(true);
    try {
      const { repriced } = await materialOrdersApi.saveDiscounts(supplier, rows);
      appMessage.success(`${t('Updated')}: ${repriced} ${t('articles')}`);
      onDone?.();
      close();
    } catch (err) {
      appMessage.error(err.response?.data?.message?.toString() || t('Import failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminModal
      title={`${t('Discount letter')} · ${supplier || ''}`}
      open={!!supplier}
      onCancel={close}
      onSave={save}
      saveText={t('Import')}
      saveDisabled={!rows.length}
      saveLoading={busy}
      width={560}
      destroyOnHidden
    >
      <Upload.Dragger
        accept=".xlsx,.xls,.csv,.txt"
        showUploadList={false}
        beforeUpload={(picked) => { pick(picked); return false; }}
      >
        <p style={{ margin: 0 }}><InboxOutlined style={{ fontSize: 28, color: 'var(--color-primary, #2394FF)' }} /></p>
        <p style={{ margin: '8px 0 0' }}>
          {file ? `${file.name} · ${rows.length} ${t('discount groups')}` : t('Excel or CSV from the grossist')}
        </p>
      </Upload.Dragger>
    </AdminModal>
  );
}
