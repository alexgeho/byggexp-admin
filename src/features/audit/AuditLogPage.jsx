'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Tag } from 'antd';
import apiClient from '@/src/api/apiClient';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';

const METHOD_COLOR = { POST: 'green', PUT: 'blue', PATCH: 'blue', DELETE: 'red' };
const shortId = (id) => (id && id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id || '—');

// Company-scoped audit trail: who changed what, when, and whether it succeeded.
export default function AuditLogPage() {
  const { t } = useLanguage();
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient
      .get('/audit-logs', { params: { page, pageSize } })
      .then((res) => { if (active) setData(res.data || { items: [], total: 0 }); })
      .catch(() => { if (active) setData({ items: [], total: 0 }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  const columns = useMemo(() => [
    {
      title: t('Time'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => formatAdminDateTime(v),
    },
    {
      title: t('User'),
      key: 'user',
      render: (_, r) => (
        <div className="approvals-cell">
          <span className="approvals-cell__primary">{r.userEmail || '—'}</span>
          {r.userRole ? <span className="approvals-cell__secondary">{r.userRole}</span> : null}
        </div>
      ),
    },
    {
      title: t('Action'),
      dataIndex: 'method',
      key: 'method',
      render: (v) => <Tag color={METHOD_COLOR[v] || 'default'}>{v}</Tag>,
    },
    {
      title: t('Resource'),
      key: 'resource',
      render: (_, r) => (
        <div className="approvals-cell">
          <span className="approvals-cell__primary">{r.entityType || '—'}</span>
          {r.entityId ? <span className="approvals-cell__secondary">{shortId(r.entityId)}</span> : null}
        </div>
      ),
    },
    {
      title: t('Status'),
      dataIndex: 'statusCode',
      key: 'statusCode',
      align: 'right',
      render: (v, r) => (
        <Tag color={r.success ? 'green' : 'red'}>{v}</Tag>
      ),
    },
  ], [t]);

  return (
    <Card className="dashboard-section-card" title={t('Audit log')}>
      <Table
        className="dashboard-overview__table"
        columns={columns}
        dataSource={data.items}
        rowKey={(r) => r._id}
        loading={loading}
        size="small"
        scroll={{ x: 720 }}
        pagination={{
          current: page,
          pageSize,
          total: data.total,
          showSizeChanger: false,
          onChange: setPage,
        }}
        locale={{ emptyText: t('No events yet') }}
      />
    </Card>
  );
}
