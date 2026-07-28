import { useEffect, useState } from 'react';
import { Button, Upload, message } from 'antd';
import { ScanOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';

// Uploads a receipt/invoice image or PDF to the OCR endpoint and hands the
// extracted fields back to the form. Hidden when scanning isn't configured.
export default function ScanButton({ onScanned, label }) {
  const t = useT();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient
      .get('/scan/status')
      .then(({ data }) => setEnabled(Boolean(data?.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;

  const scan = async (file) => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await apiClient.post('/scan', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onScanned?.(data);
      message.success(t('Scanned — check the fields'));
    } catch (err) {
      message.error(formatApiError(err, 'Could not scan the document'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Upload
      accept="image/*,application/pdf"
      showUploadList={false}
      beforeUpload={(file) => { void scan(file); return false; }}
    >
      <Button icon={<ScanOutlined />} loading={loading}>
        {label || t('Scan')}
      </Button>
    </Upload>
  );
}
