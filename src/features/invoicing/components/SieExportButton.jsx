import { useState } from 'react';
import { Button, Checkbox, Space, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';

// Exports booked invoices and supplier invoices as a SIE4 file for import into
// Fortnox / Visma / BL Administration.
export default function SieExportButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(() => dayjs().startOf('year').format('YYYY-MM-DD'));
  const [to, setTo] = useState(() => dayjs().endOf('year').format('YYYY-MM-DD'));
  const [types, setTypes] = useState(['invoices', 'suppliers']);
  const [loading, setLoading] = useState(false);

  const download = async () => {
    if (!types.length) {
      message.warning(t('Select at least one type to export'));
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get('/accounting/sie', {
        params: { from, to, types: types.join(',') },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `byggexp_${from}_${to}.se`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      message.error(formatApiError(err, 'Failed to export SIE file'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button icon={<DownloadOutlined />} onClick={() => setOpen(true)}>
        {t('Export SIE')}
      </Button>

      <AdminModal
        title={t('Export to accounting (SIE)')}
        open={open}
        onSave={download}
        onCancel={() => setOpen(false)}
        saveText={t('Download')}
        saveLoading={loading}
        width={520}
      >
        <div style={{ padding: 20 }}>
          <p style={{ marginTop: 0, color: 'var(--muted, #64748b)' }}>
            {t('Generates a SIE4 file for Fortnox, Visma or BL Administration.')}
          </p>
          <Space align="center" wrap style={{ marginBottom: 16 }}>
            <span>{t('Period')}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span>–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Space>
          <Checkbox.Group
            value={types}
            onChange={setTypes}
            options={[
              { value: 'invoices', label: t('Customer invoices') },
              { value: 'suppliers', label: t('Supplier invoices') },
            ]}
          />
        </div>
      </AdminModal>
    </>
  );
}
