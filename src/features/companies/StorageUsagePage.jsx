'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Progress, Spin, Table, Tag, Tooltip } from 'antd';
import { CloudServerOutlined, ReloadOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { formatBytes } from '@/src/utils/formatBytes';
import { useT } from '@/src/i18n/LanguageProvider';

// Superadmin view: how much uploaded-file storage each company occupies on disk.
// Data comes from GET /company/storage-usage (bytes attributed per company via
// each record's company link). Read-only.
export default function StorageUsagePage() {
  const t = useT();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiClient
      .get('/company/storage-usage')
      .then(({ data }) => setReport(data))
      .catch(() => appMessage.error(t('Could not load storage usage')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const maxBytes = useMemo(
    () => (report?.companies || []).reduce((m, c) => Math.max(m, c.totalBytes), 0),
    [report],
  );

  const columns = useMemo(() => [
    {
      title: t('Company'),
      dataIndex: 'name',
      key: 'name',
      render: (v) => <span className="admin-link-cell">{v || '—'}</span>,
    },
    {
      title: t('Files'),
      dataIndex: 'fileCount',
      key: 'fileCount',
      align: 'right',
      width: 100,
      sorter: (a, b) => a.fileCount - b.fileCount,
      render: (v) => v || 0,
    },
    {
      title: t('Size'),
      dataIndex: 'totalBytes',
      key: 'totalBytes',
      width: 320,
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.totalBytes - b.totalBytes,
      render: (v, r) => {
        const cats = Object.entries(r.byCategory || {}).sort((a, b) => b[1] - a[1]);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tooltip
              title={cats.length
                ? cats.map(([k, b]) => `${t(CATEGORY_LABELS[k] || k)}: ${formatBytes(b)}`).join('\n')
                : t('No files')}
            >
              <Progress
                percent={maxBytes ? Math.round((v / maxBytes) * 100) : 0}
                showInfo={false}
                strokeColor="#0785F4"
                style={{ flex: 1, minWidth: 140, margin: 0 }}
              />
            </Tooltip>
            <span style={{ minWidth: 72, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {formatBytes(v)}
            </span>
          </div>
        );
      },
    },
    {
      title: t('Breakdown'),
      key: 'breakdown',
      render: (_, r) => {
        const cats = Object.entries(r.byCategory || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
        if (!cats.length) return <span style={{ color: 'var(--muted, #94a3b8)' }}>—</span>;
        return (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {cats.map(([k, b]) => (
              <Tag key={k} style={{ margin: 0 }}>
                {t(CATEGORY_LABELS[k] || k)} · {formatBytes(b)}
              </Tag>
            ))}
          </span>
        );
      },
    },
  ], [t, maxBytes]);

  if (loading && !report) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}><Spin /></div>;
  }

  const companies = report?.companies || [];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <CloudServerOutlined style={{ fontSize: 22, color: '#0785F4' }} />
        <h1 style={{ margin: 0, fontSize: 22 }}>{t('Storage usage')}</h1>
        <Tooltip title={t('Refresh')}>
          <ReloadOutlined
            onClick={load}
            spin={loading}
            style={{ marginLeft: 4, cursor: 'pointer', color: 'var(--muted, #64748b)' }}
          />
        </Tooltip>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <SummaryCard label={t('Total on disk')} value={formatBytes(report?.totalDiskBytes)} />
        <SummaryCard label={t('Attributed to companies')} value={formatBytes(report?.attributedBytes)} />
        <SummaryCard
          label={t('Unattributed / orphaned')}
          value={formatBytes(report?.orphanBytes)}
          hint={t('Files on disk not linked to any company record')}
        />
        <SummaryCard label={t('Companies')} value={String(companies.length)} />
      </div>

      <Table
        rowKey="companyId"
        dataSource={companies}
        columns={columns}
        pagination={companies.length > 25 ? { pageSize: 25 } : false}
        size="middle"
      />
    </div>
  );
}

function SummaryCard({ label, value, hint }) {
  return (
    <Card size="small" style={{ minWidth: 190, flex: '1 1 190px' }}>
      <div style={{ color: 'var(--muted, #64748b)', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{value}</div>
      {hint ? <div style={{ color: 'var(--muted, #94a3b8)', fontSize: 11, marginTop: 2 }}>{hint}</div> : null}
    </Card>
  );
}

// Maps the backend storage categories to translatable labels.
const CATEGORY_LABELS = {
  logos: 'Company logos',
  'supplier-invoices': 'Purchase invoices',
  expenses: 'Receipts',
  ata: 'ÄTA',
  dagbok: 'Dagbok photos',
  tools: 'Tool photos',
  'bug-reports': 'Bug reports',
  'project-documents': 'Project documents',
  'user-files': 'Staff files',
  'task-documents': 'Task documents',
  'shift-photos': 'Shift photos',
  'chat-attachments': 'Chat attachments',
};
