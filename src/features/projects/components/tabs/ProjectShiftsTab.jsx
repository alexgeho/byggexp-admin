import { useEffect } from 'react';
import { Tag } from 'antd';
import { useLocation, useNavigate } from '@/src/shared/routing/routerCompat';
import AdminTable from '@/src/shared/components/AdminTable';
import { useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useShiftStore } from '@/src/store/shiftStore';
import { formatAdminDate, formatAdminDateTime } from '@/src/utils/formatDateTime';
import { getShiftStatusColor, getShiftStatusLabel } from '@/src/utils/shiftStatus';
import { getShiftDetailPath } from '@/src/features/projects/utils/projectDetailUtils';

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

export default function ProjectShiftsTab({ projectId }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { shifts, loading, fetchAllAccessible } = useShiftStore();

  const workerIds = shifts.map((shift) => shift.workerId).filter(Boolean);
  const { users } = useUsersInfo(workerIds);

  useEffect(() => {
    void fetchAllAccessible({ projectId });
  }, [fetchAllAccessible, projectId]);

  const columns = [
    {
      title: 'Worker',
      key: 'worker',
      render: (_, shift) => users[shift.workerId]?.name || shift.workerId || '-',
    },
    {
      title: 'Date',
      dataIndex: 'shiftDate',
      key: 'shiftDate',
      render: (value, shift) => (
        <a onClick={() => navigate(getShiftDetailPath(pathname, shift.id))}>
          {formatAdminDate(value)}
        </a>
      ),
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: formatAdminDateTime,
    },
    {
      title: 'Ended',
      dataIndex: 'endedAt',
      key: 'endedAt',
      render: formatAdminDateTime,
    },
    {
      title: 'Duration',
      dataIndex: 'durationMs',
      key: 'durationMs',
      render: formatDuration,
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
      toolbarStart={null}
      infiniteScroll={false}
      scroll={false}
      onRow={(record) => ({
        onClick: () => navigate(getShiftDetailPath(pathname, record.id)),
        style: { cursor: 'pointer' },
      })}
    />
  );
}
