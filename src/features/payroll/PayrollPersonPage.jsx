'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeftOutlined, DownloadOutlined, MoreOutlined } from '@ant-design/icons';
import {
  Alert, Button, Card, DatePicker, Dropdown, Space, Tag,
} from 'antd';
import dayjs from 'dayjs';
import { PlainTable as Table } from '@/src/shared/components/DataTable';
import StatusTag from '@/src/shared/components/StatusTag';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { useNavigate, useOutletContext, useParams } from '@/src/shared/routing/routerCompat';
import { formatAmount, formatMoney } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { useAuthStore } from '@/src/store/authStore';
import { useProjectStore } from '@/src/store/projectStore';
import { getEntityId } from '@/src/utils/entityId';
import { systemLabel } from './PayrollSettingsDrawer';
import WageHistoryDrawer from './WageHistoryDrawer';
import { downloadPayrollExport } from './payrollExport';
import {
  dayRows, groupItems, monthRange, parseMonth, summarizeWorker, workerStatus,
} from './payrollPeopleUtils';

const qty = (value, unit) => (value
  ? `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(value)} ${unit}`
  : '');

// One person's month: every day by type (normal, övertid, OB, restid, bil,
// traktamente, frånvaro), the month's lönearter, and an export of just them.
export default function PayrollPersonPage() {
  const { userId } = useParams();
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();
  const { t, lang } = useLanguage();
  const currency = useCompanyCurrency();
  const companyId = useAuthStore((s) => s.user?.companyId);
  const { projects, fetchByCompany } = useProjectStore();
  const [month, setMonth] = useState(() => parseMonth(searchParams.get('month')));
  const [basis, setBasis] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    hideHeaderActions();
    return () => showHeaderActions();
  }, [hideHeaderActions, showHeaderActions]);

  useEffect(() => {
    if (companyId && !projects.length) void fetchByCompany(companyId);
  }, [companyId, projects.length, fetchByCompany]);

  const period = useMemo(() => monthRange(month), [month]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/payroll-basis', { params: { ...period, userIds: userId } });
      setBasis(res.data);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Failed to load the payroll basis'));
      setBasis(null);
    } finally {
      setLoading(false);
    }
  }, [period, userId, t]);

  useEffect(() => { void load(); }, [load]);

  // The worker's own shifts for the month: the day comment and a link to the
  // day card (photos, receipts, timeline).
  const [shifts, setShifts] = useState([]);
  useEffect(() => {
    apiClient.get('/shifts/list', { params: { workerId: userId, ...period } })
      .then((res) => setShifts(res.data?.items || []))
      .catch(() => setShifts([]));
  }, [userId, period]);
  const shiftByDate = useMemo(() => {
    const map = new Map();
    shifts.forEach((shift) => {
      const entry = map.get(shift.shiftDate) || { id: getEntityId(shift), notes: [] };
      const note = String(shift.dayNote || '').trim();
      if (note && !entry.notes.includes(note)) entry.notes.push(note);
      map.set(shift.shiftDate, entry);
    });
    return map;
  }, [shifts]);

  useEffect(() => {
    apiClient.get('/payroll-basis/settings').then((res) => setSettings(res.data)).catch(() => {});
  }, []);

  const worker = basis?.workers?.[0] || null;
  const days = useMemo(() => dayRows(worker), [worker]);
  const totals = useMemo(() => summarizeWorker(worker), [worker]);
  const projectName = (id) => projects.find((p) => getEntityId(p) === id)?.name || '';
  const itemLabel = (code) => settings?.salaryItems?.[code] || settings?.absenceItems?.[code] || code;

  const changeMonth = (value) => {
    if (!value) return;
    const next = value.startOf('month');
    setMonth(next);
    navigate(`?month=${next.format('YYYY-MM')}`, { replace: true });
  };

  const exportPerson = async () => {
    setExporting(true);
    try {
      await downloadPayrollExport({
        ...period, userIds: [userId], settings, t,
      });
      void load();
    } catch {
      appMessage.error(t('Export failed'));
    } finally {
      setExporting(false);
    }
  };

  const dayColumns = [
    {
      title: t('Date'),
      dataIndex: 'date',
      key: 'date',
      width: 160,
      render: (d) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          {`${new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(dayjs(d).toDate())} ${formatAdminDate(d)}`}
        </span>
      ),
    },
    {
      title: t('Project'), key: 'project', width: 240, ellipsis: true, render: (_, r) => r.projectIds.map(projectName).filter(Boolean).join(', '),
    },
    { title: t('Normal'), key: 'normal', align: 'right', render: (_, r) => qty(r.normal, 'h') },
    { title: t('Overtime'), key: 'overtime', align: 'right', render: (_, r) => qty(r.overtime, 'h') },
    { title: 'OB', key: 'ob', align: 'right', render: (_, r) => qty(r.ob, 'h') },
    { title: t('Travel time'), key: 'travel', align: 'right', render: (_, r) => qty(r.travel, 'h') },
    { title: t('Car'), key: 'km', align: 'right', render: (_, r) => qty(r.km, 'km') },
    {
      title: t('Per diem'), key: 'perDiem', align: 'right', width: 120, render: (_, r) => ({ full: t('Full day'), half: t('Half day') }[r.perDiem] || ''),
    },
    { title: t('Absence'), key: 'absence', align: 'right', render: (_, r) => qty(r.absence, 'h') },
    { title: t('Amount'), key: 'amount', align: 'right', width: 150, render: (_, r) => (r.amount ? formatMoney(r.amount, currency) : '') },
    {
      title: t('Comment'),
      key: 'comment',
      width: 260,
      ellipsis: true,
      render: (_, r) => {
        const note = (shiftByDate.get(r.date)?.notes || []).join(' · ');
        return note ? <span title={note}>{note}</span> : '';
      },
    },
  ];

  const itemColumns = [
    { title: t('Item'), dataIndex: 'code', key: 'code', render: (code) => itemLabel(code) },
    {
      title: t('Quantity'),
      key: 'quantity',
      align: 'right',
      render: (_, r) => {
        if (r.unit === 'sek') return '';
        const unit = { h: 'h', km: 'km', day: t('days') }[r.unit] || '';
        return `${formatAmount(r.unit === 'day' ? r.days : r.quantity)} ${unit}`;
      },
    },
    {
      title: t('Amount'), dataIndex: 'amount', key: 'amount', align: 'right', render: (v, r) => (r.kind === 'absence' ? '' : formatMoney(v, currency)),
    },
    {
      title: '',
      key: 'flags',
      render: (_, r) => (
        <Space size={4}>
          {r.taxFree ? <Tag>{t('Tax-free')}</Tag> : null}
          {basis?.unmappedCodes?.includes(r.code) ? <Tag color="orange">{t('No löneart')}</Tag> : null}
        </Space>
      ),
    },
  ];

  const name = worker?.name || '';

  return (
    <div className="invoice-create-page">
      <Space className="invoice-create-page__toolbar" align="center" wrap>
        <Button size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate('/company/invoicing/payroll')}>{t('Payroll')}</Button>
        <DatePicker picker="month" size="large" style={{ width: 180 }} value={month} allowClear={false} format="MMMM YYYY" onChange={changeMonth} />
        <Button
          type="primary"
          size="large"
          icon={<DownloadOutlined />}
          onClick={exportPerson}
          loading={exporting}
          disabled={!worker?.items?.length}
        >
          {`${t('Export to')} ${systemLabel(settings?.payrollSystem, t)}`}
        </Button>
        <Dropdown
          trigger={['click']}
          menu={{ items: [{ key: 'history', label: t('Wage history'), onClick: () => setHistoryOpen(true) }] }}
        >
          <Button size="large" icon={<MoreOutlined />} aria-label={t('More')} />
        </Dropdown>
      </Space>

      <Card
        className="invoice-create-page__card"
        loading={loading && !basis}
        title={(
          <Space size={12}>
            <span>{name}</span>
            {worker ? <StatusTag status={workerStatus(worker)} /> : null}
          </Space>
        )}
      >
        {worker?.warnings?.length ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={[...new Set(worker.warnings.map((w) => w.message))].join(' · ')}
          />
        ) : null}
        <Table
          dataSource={days}
          columns={dayColumns}
          pagination={false}
          scroll={{ x: 1440 }}
          rowClassName={(r) => (shiftByDate.get(r.date) ? 'admin-row--clickable' : '')}
          onRow={(r) => ({
            onClick: () => {
              const shift = shiftByDate.get(r.date);
              if (shift?.id) navigate(`/company/shifts/${shift.id}`);
            },
          })}
          summary={() => (days.length ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}><strong>{t('Total')}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><strong>{qty(totals.normal, 'h')}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><strong>{qty(totals.overtime, 'h')}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><strong>{qty(totals.ob, 'h')}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><strong>{qty(totals.travel, 'h')}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right"><strong>{qty(totals.km, 'km')}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right"><strong>{qty(totals.perDiemDays, t(totals.perDiemDays === 1 ? 'day' : 'days'))}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right"><strong>{qty(totals.absence, 'h')}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right"><strong>{totals.amount ? formatMoney(totals.amount, currency) : ''}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={10} />
            </Table.Summary.Row>
          ) : null)}
        />
      </Card>

      {worker?.items?.length ? (
        <Card className="invoice-create-page__card" title={t('Lönearter')} style={{ marginTop: 16 }}>
          <Table
            size="small"
            dataSource={groupItems(worker.items).map((r) => ({ ...r, key: r.code }))}
            columns={itemColumns}
            pagination={false}
          />
        </Card>
      ) : null}

      <WageHistoryDrawer
        worker={worker}
        open={historyOpen && !!worker}
        onClose={() => setHistoryOpen(false)}
        onChanged={() => void load()}
      />
    </div>
  );
}
