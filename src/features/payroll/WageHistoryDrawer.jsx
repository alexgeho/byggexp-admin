'use client';

import { useCallback, useEffect, useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, DatePicker, Drawer, InputNumber, Popconfirm, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { getEntityId } from '@/src/utils/entityId';

const REASON_LABELS = {
  initial: 'Starting wage',
  manual: 'Changed by admin',
  agreement_raise: 'Agreement raise',
};

// Lönehistorik for one worker: which hourly wage applied from which date.
// Each payroll day is paid at the wage in force that day.
export default function WageHistoryDrawer({ worker, open, onClose, onChanged }) {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState(null);
  const [from, setFrom] = useState(dayjs());
  const [saving, setSaving] = useState(false);

  const userId = worker?.userId;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/payroll-basis/wage-rates/${userId}`);
      setData(res.data);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to load wage history'));
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => { if (open) void load(); }, [open, load]);

  const add = async () => {
    if (!(Number(rate) > 0)) return;
    setSaving(true);
    try {
      const res = await apiClient.post('/payroll-basis/wage-rates', {
        userId,
        hourlyRate: Number(rate),
        validFrom: from.format('YYYY-MM-DD'),
      });
      setData(res.data);
      setRate(null);
      onChanged?.();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      const res = await apiClient.delete(`/payroll-basis/wage-rates/${id}`);
      setData(res.data);
      onChanged?.();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to delete'));
    }
  };

  return (
    <Drawer
      title={`${t('Wage history')} · ${worker?.name || ''}`}
      open={open}
      width={560}
      onClose={onClose}
      destroyOnHidden
    >
      <p style={{ marginTop: 0, color: 'var(--muted, #64748b)' }}>
        {`${t('Current wage')}: ${data?.currentRate != null ? `${formatAmount(data.currentRate)} kr/h` : '—'}`}
      </p>
      <Table
        loading={loading}
        pagination={false}
        dataSource={(data?.rates || []).map((r) => ({ ...r, key: getEntityId(r) }))}
        locale={{ emptyText: t('No history yet — the current wage applies to every day') }}
        columns={[
          { title: t('From'), dataIndex: 'validFrom', key: 'validFrom', render: (v) => (v === '2000-01-01' ? t('Before history') : formatAdminDate(v)) },
          { title: t('Hourly wage'), dataIndex: 'hourlyRate', key: 'hourlyRate', align: 'right', render: (v) => formatAmount(v) },
          { title: t('Reason'), dataIndex: 'reason', key: 'reason', render: (v) => <Tag>{t(REASON_LABELS[v] || v)}</Tag> },
          {
            title: '',
            key: 'actions',
            align: 'right',
            render: (_, r) => (
              <Popconfirm title={t('Delete this wage row?')} okText={t('Delete')} cancelText={t('Cancel')} onConfirm={() => remove(getEntityId(r))}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
      />
      <Space wrap style={{ marginTop: 16 }}>
        <DatePicker value={from} onChange={(v) => v && setFrom(v)} allowClear={false} format="YYYY-MM-DD" />
        <InputNumber min={0} step={0.01} value={rate} onChange={setRate} placeholder="kr/h" />
        <Button icon={<PlusOutlined />} onClick={add} loading={saving}>{t('Add wage from date')}</Button>
      </Space>
    </Drawer>
  );
}
