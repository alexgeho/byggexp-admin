'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Select, Space, Switch, Tag, Tooltip } from 'antd';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { getEntityId } from '@/src/utils/entityId';

const AREA_LABELS = {
  agreement: 'Agreement',
  tax: 'Tax',
  agi: 'AGI',
};

// Regelbevakning: the pages pay rules come from. A weekly check flags any
// that changed; a superadmin reviews them and publishes a new version.
export default function RuleWatchCard() {
  const { t } = useLanguage();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/payroll-basis/watch/sources');
      setSources(res.data || []);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to load sources'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const act = async (id, fn, ok) => {
    setBusyId(id);
    try {
      await fn();
      if (ok) appMessage.success(ok);
      await load();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Something went wrong'));
    } finally {
      setBusyId(null);
    }
  };

  const addSource = async () => {
    const values = await form.validateFields();
    setAdding(true);
    try {
      await apiClient.post('/payroll-basis/watch/sources', values);
      form.resetFields();
      await load();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to save'));
    } finally {
      setAdding(false);
    }
  };

  const columns = [
    {
      title: t('Source'),
      key: 'name',
      render: (_, s) => <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>,
    },
    { title: t('Area'), dataIndex: 'area', key: 'area', render: (v) => t(AREA_LABELS[v] || v) },
    {
      title: t('Status'),
      key: 'status',
      render: (_, s) => {
        if (s.lastError) return <Tooltip title={s.lastError}><Tag color="red">{t('Could not read')}</Tag></Tooltip>;
        if (s.needsReview) return <Tag color="orange">{t('Changed — review')}</Tag>;
        if (!s.lastCheckedAt) return <Tag>{t('Not checked yet')}</Tag>;
        return <Tag>{t('No change')}</Tag>;
      },
    },
    {
      title: t('Checked'),
      dataIndex: 'lastCheckedAt',
      key: 'lastCheckedAt',
      render: (v) => (v ? formatAdminDate(v) : '—'),
    },
    {
      title: t('Changed'),
      dataIndex: 'lastChangedAt',
      key: 'lastChangedAt',
      render: (v) => (v ? formatAdminDate(v) : '—'),
    },
    {
      title: t('Active'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (v, s) => (
        <Switch
          size="small"
          checked={v}
          onChange={(enabled) => act(getEntityId(s), () => apiClient.patch(`/payroll-basis/watch/sources/${getEntityId(s)}`, { enabled }))}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, s) => {
        const id = getEntityId(s);
        return (
          <Space size={4}>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={busyId === id}
              onClick={() => act(id, () => apiClient.post(`/payroll-basis/watch/sources/${id}/check`), t('Checked'))}
            >
              {t('Check now')}
            </Button>
            {s.needsReview ? (
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => act(id, () => apiClient.post(`/payroll-basis/watch/sources/${id}/reviewed`), t('Marked as reviewed'))}
              >
                {t('Reviewed')}
              </Button>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <Card className="invoice-create-page__card" title={t('Rule watch')} style={{ marginTop: 16 }}>
      <p style={{ marginTop: 0, color: 'var(--muted, #64748b)' }}>
        {t('Checked every Monday. When a page changes, superadmins get an e-mail. Review the change and, if figures changed, publish a new agreement version.')}
      </p>
      <Table
        dataSource={sources.map((s) => ({ ...s, key: getEntityId(s) }))}
        columns={columns}
        loading={loading}
        pagination={false}
        scroll={{ x: 900 }}
        expandable={{
          rowExpandable: (s) => Boolean(s.lastExcerpt),
          expandedRowRender: (s) => (
            <p style={{ margin: 0, color: 'var(--muted, #64748b)' }}>{`${s.lastExcerpt}…`}</p>
          ),
        }}
      />
      <Form form={form} layout="inline" style={{ marginTop: 16, rowGap: 8 }}>
        <Form.Item name="name" rules={[{ required: true }]}>
          <Input placeholder={t('Name')} style={{ width: 220 }} />
        </Form.Item>
        <Form.Item name="url" rules={[{ required: true, pattern: /^https:\/\//, message: 'https://…' }]}>
          <Input placeholder="https://…" style={{ width: 360 }} />
        </Form.Item>
        <Form.Item name="area" initialValue="agreement">
          <Select
            style={{ width: 140 }}
            options={Object.entries(AREA_LABELS).map(([value, label]) => ({ value, label: t(label) }))}
          />
        </Form.Item>
        <Button icon={<PlusOutlined />} onClick={addSource} loading={adding}>{t('Add source')}</Button>
      </Form>
    </Card>
  );
}
