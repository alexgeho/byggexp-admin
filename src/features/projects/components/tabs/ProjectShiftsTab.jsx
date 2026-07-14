import { useEffect } from 'react';
import { Avatar, Tag } from 'antd';
import { useLocation, useNavigate } from '@/src/shared/routing/routerCompat';
import apiClient from '@/src/api/apiClient';
import AdminTable from '@/src/shared/components/AdminTable';
import { useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useShiftStore } from '@/src/store/shiftStore';
import { formatAdminDate, formatAdminDateTime } from '@/src/utils/formatDateTime';
import { getShiftStatusColor, getShiftStatusLabel } from '@/src/utils/shiftStatus';
import { getShiftDetailPath, resolveDocumentUrl } from '@/src/features/projects/utils/projectDetailUtils';
import ToolPhotoStrip from '@/src/features/tools/components/ToolPhotoStrip';

const isImageFile = (file) => {
  const mimeType = file?.mimeType || '';
  const url = file?.url || '';
  return mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(url);
};

const resolveUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, apiClient.defaults.baseURL).toString();
  } catch {
    return url;
  }
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
      render: (_, shift) => {
        const user = users[shift.workerId];
        const displayName = user?.name || shift.workerName || shift.workerId || '-';

        if (displayName === '-') {
          return '-';
        }

        const avatarUrl = resolveUrl(user?.avatarUrl);

        return (
          <span className="admin-table-user">
            <Avatar size={39} src={avatarUrl} className="admin-table-user__avatar">
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <span className="admin-table-user__name">{displayName}</span>
          </span>
        );
      },
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
      render: (_, shift) => {
        const photoUrls = (shift.photos || [])
          .filter(isImageFile)
          .map((photo) => resolveDocumentUrl(photo.url))
          .filter(Boolean);

        return (
          <div
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            role="presentation"
          >
            <ToolPhotoStrip photoUrls={photoUrls} alt="Shift photo" />
          </div>
        );
      },
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
