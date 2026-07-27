import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Button, Space, Table, message } from 'antd';
import { DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';

// Electronic personalliggare (attendance register) for one construction site,
// derived from the workers' shift check-in/out times. Required by Skatteverket.
export default function ProjectPersonalliggareTab({ projectId }) {
  const t = useT();
  const [from, setFrom] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(() => dayjs().endOf('month').format('YYYY-MM-DD'));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/shifts/personalliggare/${projectId}`, {
        params: { from, to },
      });
      setRows(data?.rows || []);
    } catch (err) {
      message.error(formatApiError(err, 'Failed to load personalliggare'));
    } finally {
      setLoading(false);
    }
  }, [projectId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadPdf = async () => {
    try {
      const res = await apiClient.get(`/shifts/personalliggare/${projectId}/pdf`, {
        params: { from, to },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `personalliggare_${from}_${to}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error(t('Failed to load personalliggare'));
    }
  };

  const downloadCsv = () => {
    const head = ['Datum', 'Namn', 'Personnummer', 'Företag', 'Org.nr', 'In', 'Ut'];
    const lines = [head.join(';')];
    rows.forEach((r) => {
      lines.push([r.date, r.workerName, r.personalNumber, r.companyName, r.orgNumber, r.checkIn, r.checkOut].join(';'));
    });
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personalliggare_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { title: t('Date'), dataIndex: 'date', key: 'date' },
    { title: t('Name'), dataIndex: 'workerName', key: 'workerName', render: (v) => v || '—' },
    { title: t('Personnummer'), dataIndex: 'personalNumber', key: 'personalNumber', render: (v) => v || '—' },
    {
      title: t('Company'),
      key: 'company',
      render: (_, r) => (r.orgNumber ? `${r.companyName} (${r.orgNumber})` : r.companyName || '—'),
    },
    { title: t('Check-in'), dataIndex: 'checkIn', key: 'checkIn', align: 'right' },
    { title: t('Check-out'), dataIndex: 'checkOut', key: 'checkOut', align: 'right', render: (v) => v || '—' },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }} align="center">
        <span>{t('Period')}</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span>–</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button icon={<FilePdfOutlined />} onClick={downloadPdf} disabled={!rows.length}>
          {t('Export PDF')}
        </Button>
        <Button icon={<DownloadOutlined />} onClick={downloadCsv} disabled={!rows.length}>
          {t('Export CSV')}
        </Button>
      </Space>

      <Table
        dataSource={rows.map((r, i) => ({ ...r, key: `${r.personalNumber || r.workerName}-${r.date}-${r.checkIn}-${i}` }))}
        columns={columns}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 720 }}
      />
      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted, #64748b)' }}>
        {t('Attendance is registered automatically from shift check-in/out. Available on-site for Skatteverket inspection.')}
      </p>
    </div>
  );
}
