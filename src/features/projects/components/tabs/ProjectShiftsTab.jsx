import { useEffect } from 'react';
import { Avatar, Tag } from 'antd';
import { useLocation, useNavigate } from '@/src/shared/routing/routerCompat';
import { resolveUrl } from '@/src/utils/resolveUrl';
import AdminTable from '@/src/shared/components/AdminTable';
import { useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useShiftStore } from '@/src/store/shiftStore';
import { formatAdminDate, formatAdminDateTime } from '@/src/utils/formatDateTime';
import { getShiftStatusColor, getShiftStatusLabel } from '@/src/utils/shiftStatus';
import { getShiftDetailPath, resolveDocumentUrl } from '@/src/features/projects/utils/projectDetailUtils';
import ToolPhotoStrip from '@/src/features/tools/components/ToolPhotoStrip';

import { isImageFile } from '@/src/utils/assets';

import { formatDuration } from '@/src/utils/formatDuration';
import { useT } from '@/src/i18n/LanguageProvider';

export default function ProjectShiftsTab({ projectId }) {
  const t = useT();
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
      title: t('Worker'),
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
      title: t('Date'),
      dataIndex: 'shiftDate',
      key: 'shiftDate',
      render: (value, shift) => (
        <a onClick={() => navigate(getShiftDetailPath(pathname, shift.id))}>
          {formatAdminDate(value)}
        </a>
      ),
    },
    {
      title: t('Started'),
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: formatAdminDateTime,
    },
    {
      title: t('Ended'),
      dataIndex: 'endedAt',
      key: 'endedAt',
      render: formatAdminDateTime,
    },
    {
      title: t('Duration'),
      dataIndex: 'durationMs',
      key: 'durationMs',
      render: formatDuration,
    },
    {
      title: t('Photos'),
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
      title: t('Status'),
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
