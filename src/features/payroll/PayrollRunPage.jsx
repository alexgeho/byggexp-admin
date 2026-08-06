'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Button, Card, Descriptions, Space, Spin, Table, Tag, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { usePayrollStore } from '@/src/store/payrollStore';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import StatusTag from '@/src/shared/components/StatusTag';
import { useLocation, useNavigate, useOutletContext, useParams } from '@/src/shared/routing/routerCompat';
import { getEntityId } from '@/src/utils/entityId';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';


export default function PayrollRunPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();
  const { fetchOne, updateStatus } = usePayrollStore();
  const { t } = useLanguage();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hideHeaderActions();
    return () => showHeaderActions();
  }, [hideHeaderActions, showHeaderActions]);

  const loadRun = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchOne(id);
      setRun(data);
    } catch {
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [id, fetchOne]);

  useEffect(() => {
    void loadRun();
  }, [loadRun]);

  const goBack = () => navigate(pathname.replace(/\/[^/]+$/, ''));

  const setStatus = async (status) => {
    const updated = await updateStatus(id, status);
    if (updated) setRun(updated);
  };

  const downloadCsv = (filename, rows) => {
    const blob = new Blob(['﻿' + rows.map((r) => r.join(';')).join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (!run) return;
    const rows = [['Worker', 'Hours', 'Rate', 'Factor', 'Gross', 'Tax', 'Net']];
    (run.lines || []).forEach((l) => {
      rows.push([l.name, l.hours, l.rate, l.multiplier ?? 1, l.amount, l.tax ?? 0, l.net ?? 0]);
    });
    rows.push(['Total', run.totalHours, '', '', run.totalGross ?? run.totalAmount, run.totalTax ?? 0, run.totalNet ?? 0]);
    downloadCsv(`payroll_${run.periodFrom}_${run.periodTo}.csv`, rows);
    message.success('Payroll CSV downloaded');
  };

  // Employer-side summary (AGI-style): what to report/pay per worker.
  const exportAgi = () => {
    if (!run) return;
    const rows = [['Worker', 'Gross', 'Preliminary tax', 'Employer contribution']];
    (run.lines || []).forEach((l) => {
      const employer = Math.round((Number(l.amount) || 0) * ((run.employerRate ?? 31.42) / 100) * 100) / 100;
      rows.push([l.name, l.amount, l.tax ?? 0, employer]);
    });
    rows.push(['Total', run.totalGross ?? run.totalAmount, run.totalTax ?? 0, run.employerContribution ?? 0]);
    downloadCsv(`agi_${run.periodFrom}_${run.periodTo}.csv`, rows);
    message.success('AGI summary downloaded');
  };

  const downloadPayslip = async (line) => {
    try {
      const res = await apiClient.get(`/payroll/${getEntityId(run)}/payslip/${line.userId}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lonespec_${(line.name || 'worker').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to download payslip');
    }
  };

  if (loading) {
    return (
      <div className="invoice-create-page">
        <Spin size="large" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="invoice-create-page">
        <Button icon={<ArrowLeftOutlined />} onClick={goBack}>{t('Back to payroll')}</Button>
      </div>
    );
  }

  const columns = [
    { title: t('Worker'), dataIndex: 'name', key: 'name', render: (v) => v || '—' },
    {
      title: t('Hours'), dataIndex: 'hours', key: 'hours', align: 'right', render: (v) => formatAmount(v),
    },
    {
      title: t('Rate'), dataIndex: 'rate', key: 'rate', align: 'right', render: (v) => formatAmount(v),
    },
    {
      title: t('Gross'), dataIndex: 'amount', key: 'amount', align: 'right', render: (v) => formatAmount(v),
    },
    {
      title: t('Tax'), dataIndex: 'tax', key: 'tax', align: 'right', render: (v) => formatAmount(v),
    },
    {
      title: t('Net'), dataIndex: 'net', key: 'net', align: 'right', render: (v) => formatAmount(v),
    },
    {
      title: '',
      key: 'payslip',
      align: 'right',
      render: (_, record) => (
        <Button size="small" icon={<FileTextOutlined />} onClick={() => downloadPayslip(record)}>
          {t('Payslip')}
        </Button>
      ),
    },
  ];

  return (
    <div className="invoice-create-page">
      <Space className="invoice-create-page__toolbar" align="center" wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={goBack}>{t('Back to payroll')}</Button>
        {run.status === 'draft' ? (
          <Button icon={<CheckCircleOutlined />} onClick={() => setStatus('approved')}>{t('Approve')}</Button>
        ) : null}
        {run.status !== 'paid' ? (
          <Button type="primary" icon={<DollarOutlined />} onClick={() => setStatus('paid')}>{t('Mark as paid')}</Button>
        ) : null}
        <Button icon={<DownloadOutlined />} onClick={exportCsv}>{t('Export CSV')}</Button>
        <Button icon={<DownloadOutlined />} onClick={exportAgi}>{t('AGI summary')}</Button>
      </Space>

      <Card
        className="invoice-create-page__card"
        title={(
          <Space wrap>
            <span>{`${t('Payroll')} · ${formatAdminDate(run.periodFrom)} – ${formatAdminDate(run.periodTo)}`}</span>
            <StatusTag status={run.status} upper />
            <Tag>{run.basis === 'actual' ? t('GPS') : t('Planned')}</Tag>
          </Space>
        )}
      >
        <Table
          dataSource={(run.lines || []).map((l, i) => ({ ...l, key: l.userId || i }))}
          columns={columns}
          pagination={false}
          scroll={{ x: 720 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><strong>{t('Total')}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><strong>{formatAmount(run.totalHours)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
              <Table.Summary.Cell index={3} align="right"><strong>{formatAmount(run.totalGross ?? run.totalAmount)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><strong>{formatAmount(run.totalTax)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><strong>{formatAmount(run.totalNet)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={6} />
            </Table.Summary.Row>
          )}
        />

        <Descriptions
          className="payroll-run__employer"
          size="small"
          column={1}
          bordered
          style={{ marginTop: 20, maxWidth: 460 }}
        >
          <Descriptions.Item label={t('Gross salary')}>{`${formatAmount(run.totalGross ?? run.totalAmount)} SEK`}</Descriptions.Item>
          <Descriptions.Item label={`${t('Preliminary tax')} (${formatAmount(run.taxRate ?? 30)}%)`}>{`-${formatAmount(run.totalTax)} SEK`}</Descriptions.Item>
          <Descriptions.Item label={t('Net paid to workers')}>{`${formatAmount(run.totalNet)} SEK`}</Descriptions.Item>
          <Descriptions.Item label={`${t('Employer contribution')} (${formatAmount(run.employerRate ?? 31.42)}%)`}>{`${formatAmount(run.employerContribution)} SEK`}</Descriptions.Item>
          <Descriptions.Item label={t('Total employer cost')}>{`${formatAmount(run.totalEmployerCost)} SEK`}</Descriptions.Item>
        </Descriptions>
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--muted, #64748b)' }}>
          {t('Preliminary tax is a simplified flat rate (förenklad) — verify against Skatteverket’s table.')}
        </p>
      </Card>
    </div>
  );
}
