'use client';

import { useCallback, useEffect, useState } from 'react';
import { CloudDownloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Input, InputNumber, Space } from 'antd';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAdminDate } from '@/src/utils/formatDateTime';

// Skatteverket's monthly tax tables per income year. Imported automatically
// every November–January; this card shows what is loaded and lets a
// superadmin import a year by hand.
export default function TaxTablesCard() {
  const { t } = useLanguage();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [url, setUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/payroll-basis/tax-tables');
      setYears(res.data || []);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to load tax tables'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const runImport = async () => {
    setImporting(true);
    try {
      const res = await apiClient.post('/payroll-basis/tax-tables/import', {
        year,
        ...(url.trim() ? { url: url.trim() } : {}),
      });
      appMessage.success(`${t('Imported')} ${res.data.rowCount} ${t('rows')}`);
      setUrl('');
      await load();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Import failed'));
    } finally {
      setImporting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const hasCurrent = years.some((y) => y.year === currentYear);

  return (
    <Card className="invoice-create-page__card" title={t('Tax tables (Skatteverket)')} style={{ marginTop: 16 }}>
      {!loading && !hasCurrent ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${t('No tax tables loaded for')} ${currentYear}`}
          description={t('Payroll falls back to a flat tax rate until the year is imported.')}
        />
      ) : null}
      <Table
        dataSource={years.map((y) => ({ ...y, key: y.year }))}
        loading={loading}
        pagination={false}
        columns={[
          { title: t('Year'), dataIndex: 'year', key: 'year' },
          { title: t('Rows'), dataIndex: 'rowCount', key: 'rowCount', align: 'right' },
          { title: t('Imported'), dataIndex: 'importedAt', key: 'importedAt', render: (v) => (v ? formatAdminDate(v) : '—') },
          { title: t('By'), dataIndex: 'importedBy', key: 'importedBy', render: (v) => (v === 'auto' ? t('Automatic') : t('Superadmin')) },
          {
            title: t('Source'),
            dataIndex: 'sourceUrl',
            key: 'sourceUrl',
            ellipsis: true,
            render: (v) => (v ? <a href={v} target="_blank" rel="noreferrer">{v}</a> : '—'),
          },
        ]}
      />
      <Space wrap style={{ marginTop: 16 }}>
        <InputNumber min={2020} max={2100} value={year} onChange={(v) => v && setYear(v)} />
        <Input
          placeholder={t('File URL (optional — found automatically)')}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ width: 420 }}
        />
        <Button icon={<CloudDownloadOutlined />} onClick={runImport} loading={importing}>
          {t('Import tax tables')}
        </Button>
      </Space>
    </Card>
  );
}
