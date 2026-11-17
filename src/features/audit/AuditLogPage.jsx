'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Input, Tag } from 'antd';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import apiClient from '@/src/api/apiClient';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAdminDateTime } from '@/src/utils/formatDateTime';
import { Segmented, Select } from '@/src/ui-kit';
import { useCompanyStore } from '@/src/store/companyStore';

const METHOD_COLOR = { POST: 'green', PUT: 'blue', PATCH: 'blue', DELETE: 'red' };
const shortId = (id) => (id && id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id || '—');
// Named steps of the sign-up / sign-in story (backend AuditLog.event).
const EVENT_LABEL = {
  invite_sent: 'Invitation sent',
  invite_opened: 'Invitation opened',
  invite_accepted: 'Invitation accepted',
  login: 'Sign-in',
  password_reset_requested: 'Password reset requested',
};

// Audit trail: who did what, when, and whether it succeeded.
// A company sees its own. `all` (superadmin, /admin/audit) is the support view:
// every company, with a search by e-mail, a company filter and "only errors" —
// to answer "the link does not work" from what actually happened (owner 17.11).
export default function AuditLogPage({ all = false }) {
  const { t } = useLanguage();
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [email, setEmail] = useState('');
  const [companyId, setCompanyId] = useState(undefined);
  const [failed, setFailed] = useState('all');
  const pageSize = 50;
  const { companies, fetchAll } = useCompanyStore();
  useEffect(() => { if (all) fetchAll(); }, [all, fetchAll]);
  const companyName = useMemo(
    () => Object.fromEntries((companies || []).map((c) => [String(c._id), c.name || '—'])),
    [companies],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = { page, pageSize };
    if (all) {
      if (companyId) params.companyId = companyId; else params.scope = 'all';
      if (email.trim()) params.email = email.trim();
    }
    if (failed === 'errors') params.failed = 1;
    apiClient
      .get('/audit-logs', { params })
      .then((res) => { if (active) setData(res.data || { items: [], total: 0 }); })
      .catch(() => { if (active) setData({ items: [], total: 0 }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, all, companyId, email, failed]);

  const columns = useMemo(() => [
    {
      title: t('Time'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => formatAdminDateTime(v),
    },
    ...(all ? [{
      title: t('Company'),
      key: 'company',
      render: (_, r) => companyName[String(r.companyId)] || '—',
    }] : []),
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
      key: 'method',
      render: (_, r) => (r.event
        ? <Tag color="geekblue">{t(EVENT_LABEL[r.event] || r.event)}</Tag>
        : <Tag color={METHOD_COLOR[r.method] || 'default'}>{r.method}</Tag>),
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
      title: t('Details'),
      key: 'details',
      render: (_, r) => (
        <div className="approvals-cell">
          <span className="approvals-cell__primary">{r.message || '—'}</span>
          {r.client ? <span className="approvals-cell__secondary">{r.client}</span> : null}
        </div>
      ),
    },
    {
      title: t('Status'),
      dataIndex: 'statusCode',
      key: 'statusCode',
      align: 'right',
      render: (v, r) => (
        <Tag color={r.success ? 'green' : 'red'}>{r.event ? (r.success ? 'OK' : t('Error')) : v}</Tag>
      ),
    },
  ], [t, all, companyName]);

  const reset = (setter) => (value) => { setPage(1); setter(value); };

  return (
    <Card className="dashboard-section-card" title={t('Audit log')}>
      <div className="audit-filters">
        <Segmented
          value={failed}
          onChange={reset(setFailed)}
          options={[{ value: 'all', label: t('All') }, { value: 'errors', label: t('Only errors') }]}
        />
        {all ? (
          <>
            <Select
              value={companyId}
              onChange={reset(setCompanyId)}
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t('All companies')}
              options={(companies || []).map((c) => ({ value: String(c._id), label: c.name || '—' }))}
              style={{ width: 240 }}
            />
            <Input.Search
              allowClear
              placeholder={t('E-Mail')}
              onSearch={reset(setEmail)}
              style={{ width: 280 }}
            />
          </>
        ) : null}
      </div>
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
