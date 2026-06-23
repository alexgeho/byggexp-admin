import { useEffect, useMemo } from 'react';
import { Tag } from 'antd';
import { useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import { useProjectsInfo, useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useShiftStore } from '@/src/store/shiftStore';
import AdminTable from '@/src/shared/components/AdminTable';
import { getShiftStatusColor, getShiftStatusLabel } from '@/src/utils/shiftStatus';

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const formatDuration = (durationMs = 0) => {
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return `${hours}h ${minutes}m`;
  }

  if (hours) {
    return `${hours}h`;
  }

  return `${minutes}m`;
};

export default function ShiftListPage() {
  const navigate = useNavigate();
  const { shifts, loading, fetchAllAccessible } = useShiftStore();
  const outletContext = useOutletContext();

  const workerIds = useMemo(
    () => shifts.map((shift) => shift.workerId).filter(Boolean),
    [shifts],
  );

  const projectIds = useMemo(
    () => shifts.map((shift) => shift.projectId).filter(Boolean),
    [shifts],
  );

  const { users } = useUsersInfo(workerIds);
  const { projects } = useProjectsInfo(projectIds);

  useEffect(() => {
    fetchAllAccessible();
  }, [fetchAllAccessible]);

  useEffect(() => {
    outletContext?.hideHeaderActions?.();
    outletContext?.unregisterAddButton?.();

    return () => {
      outletContext?.showHeaderActions?.();
      outletContext?.unregisterAddButton?.();
    };
  }, [outletContext]);

  const columns = [
    {
      title: 'Worker',
      key: 'worker',
      render: (_, shift) => users[shift.workerId]?.name || shift.workerId || '-',
    },
    {
      title: 'Project',
      key: 'project',
      render: (_, shift) => projects[shift.projectId]?.name || shift.projectName || '-',
    },
    {
      title: 'Date',
      dataIndex: 'shiftDate',
      key: 'shiftDate',
      render: (value, shift) => (
        <a onClick={() => navigate(`./${shift.id}`)}>{value}</a>
      ),
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: formatDateTime,
    },
    {
      title: 'Ended',
      dataIndex: 'endedAt',
      key: 'endedAt',
      render: formatDateTime,
    },
    {
      title: 'Duration',
      dataIndex: 'durationMs',
      key: 'durationMs',
      render: formatDuration,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (value) => value || '-',
    },
    {
      title: 'Photos',
      key: 'photos',
      render: (_, shift) => shift.photos?.length || 0,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag className="status-tag" color={getShiftStatusColor(status)}>
          {getShiftStatusLabel(status)}
        </Tag>
      ),
    },
  ];

  return (
    <AdminTable
      dataSource={shifts}
      columns={columns}
      rowKey="id"
      loading={loading}
      onRow={(record) => ({
        onClick: () => navigate(`./${record.id}`),
        style: { cursor: 'pointer' },
      })}
    />
  );
}
