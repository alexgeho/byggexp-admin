'use client';

import { useEffect, useMemo } from 'react';
import { Button, Segmented, Space, Tag } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminTable from '@/src/shared/components/AdminTable';
import { useApprovalsStore } from '@/src/store/approvalsStore';
import { useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { getEntityId } from '@/src/utils/entityId';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatMoney } from '@/src/utils/formatCurrency';
import { useCompanyCurrency } from '@/src/hooks/useActiveCompany';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const TYPE_META = {
  expense: { label: 'Expense', color: 'gold' },
  supplier: { label: 'Purchase invoice', color: 'blue' },
  leave: { label: 'Leave', color: 'purple' },
  overtime: { label: 'Overtime', color: 'orange' },
  certificate: { label: 'Certificate', color: 'red' },
};

// "8,5" — hours with a decimal comma, as everywhere else in the app.
const formatHours = (ms) =>
  `${String(Math.round(((Number(ms) || 0) / 3600000) * 10) / 10).replace('.', ',')} h`;

export default function ApprovalsPage() {
  const { t } = useLanguage();
  const currency = useCompanyCurrency();
  const router = useRouter();
  const {
    expenses, supplier, leave, overtime, certificates, loading, fetchAll,
    approveExpense, rejectExpense, approveSupplier, approveLeave, rejectLeave,
    decideOvertime,
  } = useApprovalsStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const userIds = useMemo(
    () => [...expenses, ...leave].map((item) => item.userId).filter(Boolean),
    [expenses, leave],
  );
  const { users } = useUsersInfo(userIds);
  const nameOf = (userId) => users[userId]?.name || users[String(userId)]?.name || '—';

  const rows = useMemo(() => {
    const list = [];

    expenses.forEach((expense) => {
      const id = getEntityId(expense);
      list.push({
        key: `expense-${id}`,
        id,
        type: 'expense',
        primary: expense.supplierName || expense.category || t('Expense'),
        secondary: nameOf(expense.userId),
        amount: expense.amount,
        date: expense.date || expense.createdAt || null,
      });
    });

    supplier.forEach((invoice) => {
      const id = getEntityId(invoice);
      list.push({
        key: `supplier-${id}`,
        id,
        type: 'supplier',
        primary: invoice.supplierName || '—',
        secondary: invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : '',
        amount: invoice.total,
        date: invoice.dueDate || null,
      });
    });

    leave.forEach((request) => {
      const id = getEntityId(request);
      const period = [request.startDate, request.endDate].filter(Boolean).join(' – ');
      list.push({
        key: `leave-${id}`,
        id,
        type: 'leave',
        primary: nameOf(request.userId),
        secondary: [request.type, period].filter(Boolean).join(' · '),
        amount: null,
        date: request.startDate || null,
      });
    });

    // Övertid inside a worker's day: "Projekt · Normal 8 h + Övertid 2 h".
    overtime.forEach((shift) => {
      const id = getEntityId(shift);
      const totalMs = shift.manualDurationMs != null ? shift.manualDurationMs : shift.durationMs;
      list.push({
        key: `overtime-${id}`,
        id,
        type: 'overtime',
        primary: shift.workerName || '—',
        secondary: [
          shift.projectName,
          `${t('Normal')} ${formatHours(Math.max(0, totalMs - shift.overtimeMs))} + ${t('Overtime')} ${formatHours(shift.overtimeMs)}`,
        ].filter(Boolean).join(' · '),
        amount: null,
        date: shift.shiftDate || null,
      });
    });

    certificates.forEach((cert) => {
      const overdue = cert.status === 'expired';
      const when = cert.daysLeft === 0
        ? t('expires today')
        : overdue
          ? `${Math.abs(cert.daysLeft)} ${t('days ago')}`
          : `${t('in')} ${cert.daysLeft} ${t('days')}`;
      list.push({
        key: `certificate-${cert.userId}-${cert.certId || cert.name}`,
        id: cert.userId,
        type: 'certificate',
        primary: `${cert.name} · ${cert.userName}`,
        secondary: `${overdue ? t('Expired') : t('Expiring soon')} · ${when}`,
        amount: null,
        date: cert.expiresAt || null,
      });
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, supplier, leave, overtime, certificates, users, t]);

  const filteredRows = useMemo(
    () => (filter === 'all' ? rows : rows.filter((row) => row.type === filter)),
    [rows, filter],
  );

  const columns = [
    {
      title: t('Type'),
      key: 'type',
      render: (_, row) => {
        const meta = TYPE_META[row.type];
        return <Tag color={meta.color}>{t(meta.label)}</Tag>;
      },
    },
    {
      title: t('Details'),
      key: 'details',
      render: (_, row) => (
        <div className="approvals-cell">
          <span className="approvals-cell__primary">{row.primary}</span>
          {row.secondary ? <span className="approvals-cell__secondary">{row.secondary}</span> : null}
        </div>
      ),
    },
    {
      title: t('Amount'),
      key: 'amount',
      align: 'right',
      render: (_, row) => (row.amount != null ? formatMoney(row.amount, currency, { decimals: false }) : '—'),
    },
    {
      title: t('Date'),
      key: 'date',
      render: (_, row) => (row.date ? formatAdminDate(row.date) : '—'),
    },
    {
      title: t('Action'),
      key: 'action',
      align: 'right',
      render: (_, row) => {
        if (row.type === 'certificate') {
          return (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/company/users/${row.id}`)}
            >
              {t('View')}
            </Button>
          );
        }

        return (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => {
                if (row.type === 'expense') approveExpense(row.id);
                else if (row.type === 'supplier') approveSupplier(row.id);
                else if (row.type === 'overtime') decideOvertime(row.id, true);
                else approveLeave(row.id);
              }}
            >
              {t('Approve')}
            </Button>
            {row.type !== 'supplier' ? (
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  if (row.type === 'expense') rejectExpense(row.id);
                  else if (row.type === 'overtime') decideOvertime(row.id, false);
                  else rejectLeave(row.id);
                }}
              >
                {t('Reject')}
              </Button>
            ) : null}
          </Space>
        );
      },
    },
  ];

  const counts = {
    all: rows.length,
    expense: expenses.length,
    supplier: supplier.length,
    leave: leave.length,
    overtime: overtime.length,
    certificate: certificates.length,
  };

  return (
    <AdminTable
      dataSource={filteredRows}
      columns={columns}
      rowKey="key"
      loading={loading}
      scroll={{ x: 720 }}
      locale={{ emptyText: t('Nothing to approve') }}
      toolbarStart={(
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `${t('All')} (${counts.all})` },
            { value: 'expense', label: `${t('Expenses')} (${counts.expense})` },
            { value: 'supplier', label: `${t('Purchase invoices')} (${counts.supplier})` },
            { value: 'leave', label: `${t('Leave')} (${counts.leave})` },
            { value: 'overtime', label: `${t('Overtime')} (${counts.overtime})` },
            { value: 'certificate', label: `${t('Certificates')} (${counts.certificate})` },
          ]}
        />
      )}
    />
  );
}
