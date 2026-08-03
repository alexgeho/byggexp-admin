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
import { formatSek } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const TYPE_META = {
  expense: { label: 'Expense', color: 'gold' },
  supplier: { label: 'Purchase invoice', color: 'blue' },
  leave: { label: 'Leave', color: 'purple' },
  certificate: { label: 'Certificate', color: 'red' },
};

export default function ApprovalsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const {
    expenses, supplier, leave, certificates, loading, fetchAll,
    approveExpense, rejectExpense, approveSupplier, approveLeave, rejectLeave,
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
  }, [expenses, supplier, leave, certificates, users, t]);

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
      render: (_, row) => (row.amount != null ? formatSek(row.amount, { decimals: false }) : '—'),
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
                onClick={() => (row.type === 'expense' ? rejectExpense(row.id) : rejectLeave(row.id))}
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
            { value: 'certificate', label: `${t('Certificates')} (${counts.certificate})` },
          ]}
        />
      )}
    />
  );
}
