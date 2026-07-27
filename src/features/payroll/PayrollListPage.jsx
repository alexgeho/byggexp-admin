import { useEffect, useMemo, useState } from 'react';
import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { usePayrollStore } from '@/src/store/payrollStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatAmount } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const STATUS_COLORS = {
  draft: 'default',
  approved: 'processing',
  paid: 'success',
};

export default function PayrollListPage() {
  const { runs, loading, fetchAll, updateStatus, remove } = usePayrollStore();
  const navigate = useNavigate();
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
      { value: 'all', label: 'All', count: runs.length },
      { value: 'draft', label: 'Drafts', count: countByStatus.draft || 0 },
      { value: 'approved', label: 'Approved', count: countByStatus.approved || 0 },
      { value: 'paid', label: 'Paid', count: countByStatus.paid || 0 },
    ];
  }, [runs]);

  const filteredRuns = useMemo(() => {
    if (statusFilter === 'all') {
      return runs;
    }
    return runs.filter((run) => String(run?.status || 'draft').toLowerCase() === statusFilter);
  }, [runs, statusFilter]);

  const columns = useMemo(() => [
    {
      title: 'Period',
      key: 'period',
      render: (_, record) => `${formatAdminDate(record.periodFrom)} – ${formatAdminDate(record.periodTo)}`,
    },
    {
      title: 'Basis',
      dataIndex: 'basis',
      key: 'basis',
      render: (value) => (value === 'actual' ? 'GPS' : 'Planned'),
    },
    {
      title: 'Workers',
      key: 'workers',
      align: 'right',
      render: (_, record) => record.lines?.length || 0,
    },
    {
      title: 'Hours',
      dataIndex: 'totalHours',
      key: 'totalHours',
      align: 'right',
      render: (value) => formatAmount(value),
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (value) => `${formatAmount(value)} SEK`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value = 'draft') => (
        <Tag color={STATUS_COLORS[value] || 'default'}>{String(value).toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Created',
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
              label: 'Open',
              icon: <EyeOutlined />,
              onClick: () => navigate(`${getEntityId(record)}`),
            },
            record.status === 'draft' && {
              key: 'approve',
              label: 'Approve',
              icon: <CheckCircleOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => updateStatus(getEntityId(record), 'approved'),
            },
            record.status !== 'paid' && {
              key: 'mark-paid',
              label: 'Mark as paid',
              icon: <DollarOutlined />,
              roles: ['superadmin', 'companyAdmin'],
              onClick: () => updateStatus(getEntityId(record), 'paid'),
            },
            record.status !== 'paid' && {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: 'Delete payroll run?',
              confirmOkText: 'Delete',
              confirmCancelText: 'Cancel',
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [navigate, updateStatus, remove]);

  return (
    <AdminTable
      dataSource={filteredRuns}
      columns={columns}
      rowKey="_id"
      loading={loading}
      scroll={{ x: 1080 }}
      onRow={(record) => ({ onClick: () => navigate(`${getEntityId(record)}`) })}
      toolbarStart={(
        <StatusPills
          options={statusFilterOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      )}
    />
  );
}
