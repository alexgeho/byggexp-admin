'use client';

import { useMemo } from 'react';
import { Card, Empty, Spin, Table, Tag } from 'antd';
import Link from 'next/link';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatMoney } from '@/src/utils/formatCurrency';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { matchesEntityId } from '@/src/utils/entityId';
import { daysUntilDue, isUnpaid, paymentDueTone } from '@/src/features/purchases/paymentDue';

const sum = (rows, pick) => rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);
const invoiceValue = (invoice) => invoice.roundedTotal ?? invoice.total;
const PAYMENTS_DUE_LIMIT = 5;

const TONE_TAG = {
  overdue: { color: 'red', label: 'Overdue' },
  soon: { color: 'orange', label: 'Due soon' },
};

const recordProjectId = (record) => (
  typeof record.projectId === 'object' ? record.projectId?._id : record.projectId
);

// Keep only records that belong to the picked project. Records without a project
// are dropped while a filter is active — they aren't attributable to it.
const filterByProject = (list, projectId) => {
  if (!projectId) return list;
  return list.filter((record) => matchesEntityId({ _id: recordProjectId(record) }, projectId));
};

const computeSummary = (data, now) => {
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

  return { invoiced, paid, outstanding, overdue, costs, margin, marginPercent, pendingApprovals };
};

const computePaymentsDue = (supplier, now) => (
  supplier
    .filter((invoice) => isUnpaid(invoice) && invoice.dueDate)
    .map((invoice) => ({
      ...invoice,
      _tone: paymentDueTone(invoice, now),
      _days: daysUntilDue(invoice.dueDate, now),
    }))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, PAYMENTS_DUE_LIMIT)
);

// Owner-facing money rollup. Aggregates the same list endpoints the invoicing
// screens use, optionally scoped to a single project.
export function EconomyBlock({
  data,
  loading,
  failed,
  now,
  invoicesLink,
  costsLink,
  projectId,
  onProjectChange,
}) {
  const t = useT();
  const currency = useCompanyCurrency();

  const scoped = useMemo(() => ({
    invoices: filterByProject(data.invoices, projectId),
    supplier: filterByProject(data.supplier, projectId),
    expenses: filterByProject(data.expenses, projectId),
  }), [data, projectId]);

  const summary = useMemo(() => computeSummary(scoped, now), [scoped, now]);

  const tiles = [
    {
      key: 'invoiced',
      label: t('Invoiced'),
      value: formatMoney(summary.invoiced, currency, { decimals: false }),
      note: summary.paid > 0 ? `${formatMoney(summary.paid, currency, { decimals: false })} ${t('paid')}` : t('Across all projects'),
      href: invoicesLink,
      tone: 'default',
    },
    {
      key: 'outstanding',
      label: t('Outstanding'),
      value: formatMoney(summary.outstanding, currency, { decimals: false }),
      note: summary.overdue > 0
        ? `${formatMoney(summary.overdue, currency, { decimals: false })} ${t('overdue')}`
        : t('Nothing overdue'),
      href: invoicesLink,
      tone: summary.overdue > 0 ? 'warn' : 'default',
    },
    {
      key: 'costs',
      label: t('Costs'),
      value: formatMoney(summary.costs, currency, { decimals: false }),
      note: summary.pendingApprovals > 0
        ? `${summary.pendingApprovals} ${t('awaiting approval')}`
        : t('Purchase invoices + expenses'),
      href: costsLink,
      tone: 'default',
    },
    {
      key: 'margin',
      label: t('Margin'),
      value: formatMoney(summary.margin, currency, { decimals: false }),
      note: summary.marginPercent != null ? `${summary.marginPercent}% ${t('margin')}` : t('Invoiced − costs'),
      tone: summary.margin < 0 ? 'bad' : 'good',
    },
  ];

  return (
    <Card
      className="dashboard-section-card dashboard-economy"
      title={(
        <span className="dashboard-section-card__headline">
          <span className="dashboard-section-card__headtitle">{t('Economy')}</span>
        </span>
      )}
      extra={onProjectChange ? (
        <span className="dashboard-section-card__headfilter">
          <ProjectFilterSelect value={projectId} onChange={onProjectChange} />
        </span>
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
      {invoicesLink ? (
        <div className="dashboard-section-card__footer">
          <Link href={invoicesLink} className="dashboard-section-card__action">
            {t('View all')}
          </Link>
        </div>
      ) : null}
    </Card>
  );
}

// Unpaid supplier invoices, soonest deadline first, so a due (or missed) date is
// never buried. Optionally scoped to a single project.
export function PaymentsDueBlock({ data, loading, failed, now, costsLink, projectId, onProjectChange }) {
  const t = useT();
  const currency = useCompanyCurrency();

  const supplier = useMemo(() => filterByProject(data.supplier, projectId), [data.supplier, projectId]);
  const paymentsDue = useMemo(() => computePaymentsDue(supplier, now), [supplier, now]);
  const overdueCount = useMemo(
    () => supplier.filter((invoice) => paymentDueTone(invoice, now) === 'overdue').length,
    [supplier, now],
  );

  const columns = [
    { title: t('Supplier'), key: 'supplier', render: (_, row) => row.supplierName || '—' },
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
      render: (_, row) => formatMoney(row.total, currency, { decimals: false }),
    },
  ];

  return (
    <Card
      className="dashboard-section-card dashboard-payments-due"
      title={(
        <span className="dashboard-section-card__headline">
          <span className="dashboard-payments-due__title">
            {t('Payments due')}
            {overdueCount > 0 ? <Tag color="red">{`${overdueCount} ${t('overdue')}`}</Tag> : null}
          </span>
        </span>
      )}
      extra={onProjectChange ? (
        <span className="dashboard-section-card__headfilter">
          <ProjectFilterSelect value={projectId} onChange={onProjectChange} />
        </span>
      ) : null}
    >

      {loading ? (
        <div className="dashboard-economy__loading"><Spin /></div>
      ) : failed ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Could not load economy data')} />
      ) : paymentsDue.length ? (
        <Table
          className="dashboard-overview__table"
          columns={columns}
          dataSource={paymentsDue}
          pagination={false}
          rowKey={(row) => row._id || row.id || `${row.supplierName}-${row.dueDate}`}
          size="small"
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Nothing to pay')} />
      )}
      {costsLink ? (
        <div className="dashboard-section-card__footer">
          <Link href={costsLink} className="dashboard-section-card__action">
            {t('View all')}
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
