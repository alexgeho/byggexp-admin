'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { Button, Card, Space, Spin, Table, Tag, message } from 'antd';
import { usePayrollStore } from '@/src/store/payrollStore';
import { useLocation, useNavigate, useOutletContext, useParams } from '@/src/shared/routing/routerCompat';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const STATUS_COLORS = {
  draft: 'default',
  approved: 'processing',
  paid: 'success',
};

export default function PayrollRunPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { hideHeaderActions, showHeaderActions } = useOutletContext();
  const { fetchOne, updateStatus } = usePayrollStore();
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

  const exportCsv = () => {
    if (!run) return;
    const head = ['Worker', 'Hours', 'Rate (SEK/h)', 'Amount (SEK)'];
    const lines = [head.join(';')];
    (run.lines || []).forEach((l) => {
      lines.push([l.name, l.hours, l.rate, l.amount].join(';'));
    });
    lines.push(['Total', run.totalHours, '', run.totalAmount].join(';'));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${run.periodFrom}_${run.periodTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Payroll CSV downloaded');
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
        <Button icon={<ArrowLeftOutlined />} onClick={goBack}>Back to payroll</Button>
      </div>
    );
  }

  const columns = [
    { title: 'Worker', dataIndex: 'name', key: 'name', render: (v) => v || '—' },
    {
      title: 'Hours', dataIndex: 'hours', key: 'hours', align: 'right', render: (v) => formatAmount(v),
    },
    {
      title: 'Rate (SEK/h)', dataIndex: 'rate', key: 'rate', align: 'right', render: (v) => formatAmount(v),
    },
    {
      title: 'Amount (SEK)', dataIndex: 'amount', key: 'amount', align: 'right', render: (v) => formatAmount(v),
    },
  ];

  return (
    <div className="invoice-create-page">
      <Space className="invoice-create-page__toolbar" align="center" wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={goBack}>Back to payroll</Button>
        {run.status === 'draft' ? (
          <Button icon={<CheckCircleOutlined />} onClick={() => setStatus('approved')}>Approve</Button>
        ) : null}
        {run.status !== 'paid' ? (
          <Button type="primary" icon={<DollarOutlined />} onClick={() => setStatus('paid')}>Mark as paid</Button>
        ) : null}
        <Button icon={<DownloadOutlined />} onClick={exportCsv}>Export CSV</Button>
      </Space>

      <Card
        className="invoice-create-page__card"
        title={(
          <Space wrap>
            <span>{`Payroll · ${formatAdminDate(run.periodFrom)} – ${formatAdminDate(run.periodTo)}`}</span>
            <Tag color={STATUS_COLORS[run.status] || 'default'}>{String(run.status).toUpperCase()}</Tag>
            <Tag>{run.basis === 'actual' ? 'GPS' : 'Planned'}</Tag>
          </Space>
        )}
      >
        <Table
          dataSource={(run.lines || []).map((l, i) => ({ ...l, key: l.userId || i }))}
          columns={columns}
          pagination={false}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><strong>Total</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><strong>{formatAmount(run.totalHours)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
              <Table.Summary.Cell index={3} align="right"><strong>{`${formatAmount(run.totalAmount)} SEK`}</strong></Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
}
