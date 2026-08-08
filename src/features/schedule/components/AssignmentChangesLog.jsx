'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Tag } from 'antd';
import apiClient from '@/src/api/apiClient';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';

const METHOD_COLOR = { POST: 'green', PUT: 'blue', PATCH: 'blue', DELETE: 'red' };
const isAssignmentEntry = (row) => /assign/i.test(String(row?.entityType || '')) || /assign/i.test(String(row?.path || ''));

// The Schedule "Changes log" tab: the company audit trail filtered to
// assignment changes (who assigned/removed whom, when). Reuses /audit-logs.
export default function AssignmentChangesLog() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient
      .get('/audit-logs', { params: { page: 1, pageSize: 200 } })
      .then((res) => { if (active) setItems((res.data?.items || []).filter(isAssignmentEntry)); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const columns = useMemo(() => [
    { title: t('Time'), dataIndex: 'createdAt', key: 'createdAt', render: (v) => formatAdminDateTime(v) },
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
      title: t('Status'),
      dataIndex: 'statusCode',
      key: 'statusCode',
      align: 'right',
      render: (v, r) => <Tag color={r.success ? 'green' : 'red'}>{v}</Tag>,
    },
  ], [t]);

  return (
    <Card className="dashboard-section-card">
      <Table
        className="dashboard-overview__table"
        columns={columns}
        dataSource={items}
        rowKey={(r) => r._id}
        loading={loading}
        size="small"
        scroll={{ x: 640 }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        locale={{ emptyText: t('No assignment changes yet') }}
      />
    </Card>
  );
}
