'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Drawer, InputNumber, Popconfirm, Space, Spin } from 'antd';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const CATEGORY_LABELS = {
  yrkesarbetare: 'Skilled worker',
  ny_i_branschen: 'New in the industry',
  larling: 'Apprentice',
};

// Byggavtalet's general raise for one agreement version: every covered
// worker's wage the day before, the proposed new wage (editable), and one
// click to apply them all from the raise date.
export default function RaiseProposalsDrawer({ ruleSetId, open, onClose, onApplied }) {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !ruleSetId) return;
    setLoading(true);
    apiClient
      .get(`/payroll-basis/raises/${ruleSetId}/proposals`)
      .then((res) => {
        setData(res.data);
        setRows(res.data.items.map((i) => ({
          ...i,
          include: i.proposedRate != null,
          newRate: i.alreadySet ?? i.proposedRate,
        })));
      })
      .catch((err) => appMessage.error(err.response?.data?.message || t('Failed to load proposals')))
      .finally(() => setLoading(false));
  }, [open, ruleSetId, t]);

  const update = (userId, patch) => setRows((prev) => prev.map((r) => (r.userId === userId ? { ...r, ...patch } : r)));

  const apply = async () => {
    const items = rows
      .filter((r) => r.include && Number(r.newRate) > 0)
      .map((r) => ({ userId: r.userId, hourlyRate: Number(r.newRate) }));
    setSaving(true);
    try {
      const res = await apiClient.post('/payroll-basis/raises/apply', { ruleSetId, items });
      appMessage.success(`${t('New wages saved for')} ${res.data.applied} ${t('workers')}`);
      onApplied?.();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const markHandled = async () => {
    try {
      await apiClient.post(`/payroll-basis/raises/${ruleSetId}/handled`);
      onApplied?.();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to save'));
    }
  };

  const rs = data?.ruleSet;
  const raiseText = rs
    ? (rs.kind === 'fixed' ? `+${formatAmount(rs.value)} kr/h` : `+${formatAmount(rs.value)} %`)
    : '';

  return (
    <Drawer
      title={rs ? `${t('Wage raise')} · ${rs.name}` : t('Wage raise')}
      open={open}
      width={760}
      onClose={onClose}
      destroyOnHidden
      extra={(
        <Space>
          <Popconfirm
            title={t('Mark as handled without changing wages?')}
            description={t('Use this only if the raise was already applied another way.')}
            okText={t('Mark as handled')}
            cancelText={t('Cancel')}
            onConfirm={markHandled}
          >
            <Button>{t('Mark as handled')}</Button>
          </Popconfirm>
          <Button type="primary" onClick={apply} loading={saving} disabled={!rows.some((r) => r.include)}>
            {t('Apply new wages')}
          </Button>
        </Space>
      )}
    >
      {loading || !data ? <Spin /> : (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`${raiseText} ${t('from')} ${formatAdminDate(rs.validFrom)}`}
            description={t('Proposed wage = wage the day before + the raise, and at least the new minimum for the category. Adjust any row before applying.')}
          />
          {data.uncategorized?.length ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={t('Workers without a wage category are not included')}
              description={data.uncategorized.map((u) => u.name).join(', ')}
            />
          ) : null}
          <Table
            dataSource={rows.map((r) => ({ ...r, key: r.userId }))}
            pagination={false}
            columns={[
              {
                title: '',
                key: 'include',
                width: 40,
                render: (_, r) => <Checkbox checked={r.include} onChange={(e) => update(r.userId, { include: e.target.checked })} />,
              },
              { title: t('Worker'), dataIndex: 'name', key: 'name' },
              { title: t('Wage category'), dataIndex: 'wageCategory', key: 'cat', render: (v) => t(CATEGORY_LABELS[v] || v) },
              { title: t('Current'), dataIndex: 'currentRate', key: 'current', align: 'right', render: (v) => formatAmount(v) },
              {
                title: t('New wage'),
                key: 'newRate',
                align: 'right',
                render: (_, r) => (
                  <InputNumber
                    min={0}
                    step={0.01}
                    value={r.newRate}
                    onChange={(v) => update(r.userId, { newRate: v })}
                    style={{ width: 120 }}
                  />
                ),
              },
            ]}
          />
        </>
      )}
    </Drawer>
  );
}
