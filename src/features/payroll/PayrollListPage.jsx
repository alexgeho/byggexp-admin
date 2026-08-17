import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import StatusTag from '@/src/shared/components/StatusTag';
import useBulkDelete from '@/src/shared/hooks/useBulkDelete';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { useAuthStore } from '@/src/store/authStore';
import { usePayrollStore } from '@/src/store/payrollStore';
import { getEntityId } from '@/src/utils/entityId';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';

export default function PayrollListPage() {
  const { runs, loading, fetchAll, updateStatus, remove } = usePayrollStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const userRole = useAuthStore((s) => s.user?.role);
  const canDelete = ['superadmin', 'companyAdmin'].includes(userRole);
  const bulkDelete = useBulkDelete(remove, fetchAll);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const statusFilterOptions = useMemo(() => {
    const countByStatus = runs.reduce((acc, run) => {
      const status = String(run?.status || 'draft').toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return [
      { value: 'all', label: t('All'), count: runs.length },
      { value: 'draft', label: t('Drafts'), count: countByStatus.draft || 0 },
      { value: 'approved', label: t('Approved'), count: countByStatus.approved || 0 },
      { value: 'paid', label: t('Paid'), count: countByStatus.paid || 0 },
    ];
  }, [runs, t]);

  const filteredRuns = useMemo(() => {
    if (statusFilter === 'all') {
      return runs;
    }
    return runs.filter((run) => String(run?.status || 'draft').toLowerCase() === statusFilter);
  }, [runs, statusFilter]);

  const columns = useMemo(() => [
    {
      title: t('Period'),
      key: 'period',
      render: (_, record) => `${formatAdminDate(record.periodFrom)} – ${formatAdminDate(record.periodTo)}`,
    },
    {
      title: t('Basis'),
      dataIndex: 'basis',
      key: 'basis',
      render: (value) => (value === 'actual' ? t('GPS') : t('Planned')),
    },
    {
      title: t('Workers'),
      key: 'workers',
      align: 'right',
      render: (_, record) => record.lines?.length || 0,
    },
    {
      title: t('Hours'),
      dataIndex: 'totalHours',
      key: 'totalHours',
      align: 'right',
      render: (value) => formatAmount(value),
    },
    {
      title: t('Amount'),
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (value) => `${formatAmount(value)} SEK`,
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (value = 'draft') => (
        <StatusTag status={value} upper />
      ),
    },
    {
      title: t('Created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: formatAdminDate,
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'open',
              label: t('Open'),
              icon: <EyeOutlined />,
              onClick: () => navigate(`${getEntityId(record)}`),
            },
            record.status === 'draft' && {
              key: 'approve',
              label: t('Approve'),
              icon: <CheckCircleOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => updateStatus(getEntityId(record), 'approved'),
            },
            record.status !== 'paid' && {
              key: 'mark-paid',
              label: t('Mark as paid'),
              icon: <DollarOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => updateStatus(getEntityId(record), 'paid'),
            },
            record.status !== 'paid' && {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: t('Delete payroll run?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [navigate, updateStatus, remove, t]);

  return (
    <AdminTable
      dataSource={filteredRuns}
      columns={columns}
      rowKey="_id"
      loading={loading}
      scroll={{ x: 1080 }}
      onBulkDelete={canDelete ? bulkDelete : null}
      onRow={(record) => ({ onClick: () => navigate(`${getEntityId(record)}`) })}
      statusFilter={(
        <StatusPills
          options={statusFilterOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      )}
    />
  );
}
