'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Empty, Spin, Table, Tag } from 'antd';
import Link from 'next/link';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatSek } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { daysUntilDue, isUnpaid, paymentDueTone } from '@/src/features/purchases/paymentDue';

const sum = (rows, pick) => rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);
const invoiceValue = (invoice) => invoice.roundedTotal ?? invoice.total;
const PAYMENTS_DUE_LIMIT = 5;

// Owner-facing money rollup across every project in the company. It pulls the
// same list endpoints the invoicing screens use and aggregates them client-side
// so the figures reconcile with what the owner sees per project.
export default function EconomyOverview({ invoicesLink, costsLink, middle }) {
  const t = useT();
  const [data, setData] = useState({ invoices: [], supplier: [], expenses: [] });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Captured once on mount so overdue detection stays stable across re-renders.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);

    Promise.all([
      apiClient.get('/invoices').then((res) => res.data).catch(() => null),
      apiClient.get('/supplier-invoices').then((res) => res.data).catch(() => null),
      apiClient.get('/expenses').then((res) => res.data).catch(() => null),
    ]).then(([invoices, supplier, expenses]) => {
      if (!active) return;
      if (!invoices && !supplier && !expenses) {
        setFailed(true);
      }
      setData({
        invoices: Array.isArray(invoices) ? invoices : [],
        supplier: Array.isArray(supplier) ? supplier : [],
        expenses: Array.isArray(expenses) ? expenses : [],
      });
      setLoading(false);
    });

    return () => { active = false; };
  }, []);

  const summary = useMemo(() => {
    const { invoices, supplier, expenses } = data;

    // Invoiced = everything actually sent to a customer (drafts and cancelled
    // invoices are not revenue yet).
    const billed = invoices.filter((invoice) => ['sent', 'paid', 'overdue'].includes(invoice.status));
    const invoiced = sum(billed, invoiceValue);
    const paid = sum(invoices.filter((invoice) => invoice.status === 'paid'), invoiceValue);

    const unpaid = invoices.filter((invoice) => ['sent', 'overdue'].includes(invoice.status));
    const outstanding = sum(unpaid, invoiceValue);
    const overdue = sum(
      unpaid.filter((invoice) => invoice.status === 'overdue'
        || (invoice.dueDate && new Date(invoice.dueDate).getTime() < now)),
      invoiceValue,
    );

    const supplierCost = sum(supplier, (row) => row.total);
    const expenseCost = sum(
      expenses.filter((expense) => ['approved', 'reimbursed'].includes(expense.status)),
      (expense) => expense.amount,
    );
    const costs = supplierCost + expenseCost;
    const margin = invoiced - costs;
    const marginPercent = invoiced > 0 ? Math.round((margin / invoiced) * 100) : null;

    const pendingApprovals = expenses.filter((expense) => expense.status === 'submitted').length;

    return {
      invoiced, paid, outstanding, overdue, costs, margin, marginPercent, pendingApprovals,
    };
  }, [data, now]);

  // Unpaid supplier invoices, soonest deadline first, so a due (or missed) date
  // is never buried in the list. Overdue and due-soon rows are colour-coded.
  const paymentsDue = useMemo(() => (
    data.supplier
      .filter((invoice) => isUnpaid(invoice) && invoice.dueDate)
      .map((invoice) => ({
        ...invoice,
        _tone: paymentDueTone(invoice, now),
        _days: daysUntilDue(invoice.dueDate, now),
      }))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, PAYMENTS_DUE_LIMIT)
  ), [data.supplier, now]);

  const overdueCount = useMemo(
    () => data.supplier.filter((invoice) => paymentDueTone(invoice, now) === 'overdue').length,
    [data.supplier, now],
  );

  const tiles = [
    {
      key: 'invoiced',
      label: t('Invoiced'),
      value: formatSek(summary.invoiced, { decimals: false }),
      note: summary.paid > 0 ? `${formatSek(summary.paid, { decimals: false })} ${t('paid')}` : t('Across all projects'),
      href: invoicesLink,
      tone: 'default',
    },
    {
      key: 'outstanding',
      label: t('Outstanding'),
      value: formatSek(summary.outstanding, { decimals: false }),
      note: summary.overdue > 0
        ? `${formatSek(summary.overdue, { decimals: false })} ${t('overdue')}`
        : t('Nothing overdue'),
      href: invoicesLink,
      tone: summary.overdue > 0 ? 'warn' : 'default',
    },
    {
      key: 'costs',
      label: t('Costs'),
      value: formatSek(summary.costs, { decimals: false }),
      note: summary.pendingApprovals > 0
        ? `${summary.pendingApprovals} ${t('awaiting approval')}`
        : t('Supplier invoices + expenses'),
      href: costsLink,
      tone: 'default',
    },
    {
      key: 'margin',
      label: t('Margin'),
      value: formatSek(summary.margin, { decimals: false }),
      note: summary.marginPercent != null ? `${summary.marginPercent}% ${t('margin')}` : t('Invoiced − costs'),
      tone: summary.margin < 0 ? 'bad' : 'good',
    },
  ];

  const TONE_TAG = {
    overdue: { color: 'red', label: 'Overdue' },
    soon: { color: 'orange', label: 'Due soon' },
  };

  const paymentsDueColumns = [
    {
      title: t('Supplier'),
      key: 'supplier',
      render: (_, row) => row.supplierName || '—',
    },
    {
      title: t('Due'),
      key: 'due',
      render: (_, row) => (
        <span className={`payments-due__date payments-due__date--${row._tone}`}>
          {formatAdminDate(row.dueDate)}
        </span>
      ),
    },
    {
      title: '',
      key: 'flag',
      render: (_, row) => {
        const tag = TONE_TAG[row._tone];
        return tag ? <Tag color={tag.color}>{t(tag.label)}</Tag> : null;
      },
    },
    {
      title: t('Amount'),
      key: 'amount',
      align: 'right',
      render: (_, row) => formatSek(row.total, { decimals: false }),
    },
  ];

  return (
    <>
      <Card
        className="dashboard-section-card dashboard-economy"
        title={t('Economy')}
        extra={invoicesLink ? (
          <Link href={invoicesLink} className="dashboard-section-card__action">
            {t('View all')}
          </Link>
        ) : null}
      >
        {loading ? (
          <div className="dashboard-economy__loading"><Spin /></div>
        ) : failed ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Could not load economy data')} />
        ) : (
          <div className="dashboard-economy__grid">
            {tiles.map((tile) => {
              const body = (
                <>
                  <span className="dashboard-economy__label">{tile.label}</span>
                  <strong className={`dashboard-economy__value dashboard-economy__value--${tile.tone}`}>
                    {tile.value}
                  </strong>
                  <span className="dashboard-economy__note">{tile.note}</span>
                </>
              );
              return tile.href ? (
                <Link key={tile.key} href={tile.href} className="dashboard-economy__tile dashboard-economy__tile--link">
                  {body}
                </Link>
              ) : (
                <div key={tile.key} className="dashboard-economy__tile">{body}</div>
              );
            })}
          </div>
        )}
      </Card>

      {middle}

      {!loading && !failed ? (
        <Card
          className="dashboard-section-card dashboard-payments-due"
          title={(
            <span className="dashboard-payments-due__title">
              {t('Payments due')}
              {overdueCount > 0 ? (
                <Tag color="red">{`${overdueCount} ${t('overdue')}`}</Tag>
              ) : null}
            </span>
          )}
          extra={costsLink ? (
            <Link href={costsLink} className="dashboard-section-card__action">
              {t('View all')}
            </Link>
          ) : null}
        >
          {paymentsDue.length ? (
            <Table
              className="dashboard-overview__table"
              columns={paymentsDueColumns}
              dataSource={paymentsDue}
              pagination={false}
              rowKey={(row) => row._id || row.id || `${row.supplierName}-${row.dueDate}`}
              size="small"
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Nothing to pay')} />
          )}
        </Card>
      ) : null}
    </>
  );
}
