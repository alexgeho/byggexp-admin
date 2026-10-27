'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftOutlined, CheckOutlined, DeleteOutlined, PlusOutlined,
} from '@ant-design/icons';
import {
  Button, Card, DatePicker, Input, InputNumber, Select, Space, Spin,
} from 'antd';
import dayjs from 'dayjs';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import { Button as UiButton } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { useLocation, useNavigate, useOutletContext, useParams } from '@/src/shared/routing/routerCompat';
import { getEntityId } from '@/src/utils/entityId';
import { formatAmount, formatMoney } from '@/src/utils/formatCurrency';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { lastMonth, monthRange } from './payrollPeopleUtils';
import {
  ROW_TYPES, buildPayload, changeType, emptyRow, initialRows, isHourRow, rowAmount, totalGross,
} from './manualPayrollUtils';

const TYPE_LABELS = {
  normal: 'Normal',
  overtime: 'Overtime',
  ob: 'OB',
  monthly: 'Monthly salary',
  other: 'Other',
};

// Löner → Ny lönekörning: pay entered by hand per worker (hours per hour
// type, månadslön, other rows) for companies without the shifts module. Also
// edits a manual draft (…/payroll/:id/edit).
export default function ManualPayrollPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();
  const { t } = useLanguage();
  const currency = useCompanyCurrency();
  const [month, setMonth] = useState(lastMonth);
  const [rows, setRows] = useState([]);
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const base = pathname.slice(0, pathname.indexOf('/payroll') + '/payroll'.length);

  useEffect(() => {
    hideHeaderActions();
    return () => showHeaderActions();
  }, [hideHeaderActions, showHeaderActions]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [usersRes, runRes] = await Promise.all([
          apiClient.get('/users/my-company'),
          id ? apiClient.get(`/payroll/${id}`) : Promise.resolve(null),
        ]);
        if (!alive) return;
        const run = runRes?.data;
        if (run && (run.basis !== 'manual' || run.status !== 'draft')) {
          navigate(`${base}/${id}`, { replace: true });
          return;
        }
        const users = usersRes.data || [];
        setRates(Object.fromEntries(users.map((u) => [String(getEntityId(u)), u.hourlyRate ?? null])));
        setRows(initialRows(users, run));
        if (run) setMonth(dayjs(run.periodFrom).startOf('month'));
      } catch (err) {
        appMessage.error(err.response?.data?.message || t('Failed to load payroll run'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, base, navigate, t]);

  const payload = useMemo(() => buildPayload(rows, monthRange(month)), [rows, month]);
  const gross = useMemo(() => totalGross(rows), [rows]);

  const patch = (key, change) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...change } : r)));

  const addRow = (row) => setRows((prev) => {
    const last = prev.map((r) => r.userId).lastIndexOf(row.userId);
    const next = [...prev];
    next.splice(last + 1, 0, emptyRow({ userId: row.userId, name: row.name, hourlyRate: rates[row.userId] }, 'overtime'));
    return next;
  });

  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  const save = async () => {
    setSaving(true);
    try {
      const res = id
        ? await apiClient.put(`/payroll/${id}/manual`, payload)
        : await apiClient.post('/payroll/manual', payload);
      appMessage.success(t('Saved'));
      navigate(`${base}/${getEntityId(res.data)}`);
    } catch (err) {
      const msg = err.response?.data?.message;
      appMessage.error(Array.isArray(msg) ? msg.join(', ') : msg || t('Failed to create payroll run'));
    } finally {
      setSaving(false);
    }
  };

  // Rows of one worker sit together; the name cell spans them.
  const groupInfo = useMemo(() => {
    const info = {};
    rows.forEach((r, i) => {
      const first = i === 0 || rows[i - 1].userId !== r.userId;
      const count = rows.filter((x) => x.userId === r.userId).length;
      const last = i === rows.length - 1 || rows[i + 1].userId !== r.userId;
      info[r.key] = { span: first ? count : 0, count, last };
    });
    return info;
  }, [rows]);

  const columns = [
    {
      title: t('Worker'),
      dataIndex: 'name',
      key: 'name',
      width: 220,
      onCell: (r) => ({ rowSpan: groupInfo[r.key]?.span ?? 1 }),
      render: (v) => v || '—',
    },
    {
      title: t('Type'),
      key: 'type',
      width: 170,
      render: (_, r) => (
        <Select
          value={r.type}
          style={{ width: '100%' }}
          options={ROW_TYPES.map((value) => ({ value, label: t(TYPE_LABELS[value]) }))}
          onChange={(type) => patch(r.key, changeType(r, type, rates[r.userId]))}
        />
      ),
    },
    {
      title: t('Hours'),
      key: 'hours',
      width: 120,
      onCell: (r) => ({ colSpan: r.type === 'other' ? 2 : 1 }),
      render: (_, r) => {
        if (r.type === 'other') {
          return (
            <Input
              value={r.label}
              maxLength={80}
              placeholder="Bonus"
              onChange={(e) => patch(r.key, { label: e.target.value })}
            />
          );
        }
        return isHourRow(r) ? (
          <InputNumber
            value={r.hours}
            min={0}
            max={744}
            decimalSeparator=","
            style={{ width: '100%' }}
            onChange={(hours) => patch(r.key, { hours })}
          />
        ) : null;
      },
    },
    {
      title: t('Hourly rate'),
      key: 'rate',
      width: 130,
      onCell: (r) => ({ colSpan: r.type === 'other' ? 0 : 1 }),
      render: (_, r) => (isHourRow(r) ? (
        <InputNumber
          value={r.rate}
          min={0}
          decimalSeparator=","
          style={{ width: '100%' }}
          onChange={(rate) => patch(r.key, { rate })}
        />
      ) : null),
    },
    {
      title: t('Amount'),
      key: 'amount',
      width: 150,
      align: 'right',
      render: (_, r) => (isHourRow(r) ? (rowAmount(r) ? formatAmount(rowAmount(r)) : '') : (
        <InputNumber
          value={r.amount}
          min={r.type === 'monthly' ? 0 : undefined}
          decimalSeparator=","
          style={{ width: '100%' }}
          onChange={(amount) => patch(r.key, { amount })}
        />
      )),
    },
    {
      title: '',
      key: 'actions',
      width: 96,
      align: 'right',
      render: (_, r) => (
        // Fixed slots so the icons line up across rows.
        <Space size={4}>
          <Button
            type="text"
            icon={<DeleteOutlined />}
            aria-label={t('Delete')}
            style={{ visibility: groupInfo[r.key]?.count > 1 ? 'visible' : 'hidden' }}
            onClick={() => removeRow(r.key)}
          />
          <Button
            type="text"
            icon={<PlusOutlined />}
            aria-label={t('Add row')}
            style={{ visibility: groupInfo[r.key]?.last ? 'visible' : 'hidden' }}
            onClick={() => addRow(r)}
          />
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="invoice-create-page">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="invoice-create-page">
      <Space className="invoice-create-page__toolbar" align="center" wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(base)}>{t('Back to payroll')}</Button>
        <DatePicker
          picker="month"
          size="large"
          style={{ width: 180 }}
          value={month}
          allowClear={false}
          format="MMMM YYYY"
          onChange={(v) => v && setMonth(v.startOf('month'))}
        />
        <UiButton
          icon={<CheckOutlined />}
          loading={saving}
          disabled={!payload.employees.length}
          onClick={save}
        >
          {t('Save')}
        </UiButton>
      </Space>

      <Card className="invoice-create-page__card" title={t('New payroll run')}>
        <Table
          dataSource={rows}
          columns={columns}
          rowKey="key"
          pagination={false}
          scroll={{ x: 880 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}><strong>{t('Gross salary')}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><strong>{formatMoney(gross, currency)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={5} />
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
}
