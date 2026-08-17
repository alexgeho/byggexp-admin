import { useEffect, useMemo, useState } from 'react';
import { Avatar, Tag } from 'antd';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { resolveUrl } from '@/src/utils/resolveUrl';
import { useProjectsInfo, useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import { useShiftStore } from '@/src/store/shiftStore';
import AdminTable from '@/src/shared/components/AdminTable';
import { getShiftStatusColor, getShiftStatusLabel } from '@/src/utils/shiftStatus';
import { formatAdminDate, formatAdminDateTime } from '@/src/utils/formatDateTime';
import { matchesEntityId } from '@/src/utils/entityId';
import ToolPhotoStrip from '@/src/features/tools/components/ToolPhotoStrip';
import { resolveDocumentUrl } from '@/src/features/projects/utils/projectDetailUtils';
import { useT } from '@/src/i18n/LanguageProvider';

import { isImageFile } from '@/src/utils/assets';

import { formatDuration } from '@/src/utils/formatDuration';

export default function ShiftListPage() {
  const navigate = useNavigate();
  const t = useT();
  const { shifts, loading, fetchAllAccessible } = useShiftStore();
  const [selectedProjectId, setSelectedProjectId] = useState(undefined);

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

  const filteredShifts = useMemo(() => {
    if (!selectedProjectId) {
      return shifts;
    }

    return shifts.filter((shift) =>
      shift.projectId && matchesEntityId({ _id: shift.projectId }, selectedProjectId),
    );
  }, [shifts, selectedProjectId]);

  const toolbarStart = useMemo(() => (
    <div className="admin-table-toolbar-filters">
      <ProjectFilterSelect
        value={selectedProjectId}
        onChange={setSelectedProjectId}
      />
    </div>
  ), [selectedProjectId]);

  useEffect(() => {
    fetchAllAccessible();
  }, [fetchAllAccessible]);

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
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag className="status-tag" color={getShiftStatusColor(status)}>
          {t(getShiftStatusLabel(status))}
        </Tag>
      ),
    },
    {
      title: t('Project'),
      key: 'project',
      render: (_, shift) => projects[shift.projectId]?.name || shift.projectName || '-',
    },
    {
      title: t('Date'),
      dataIndex: 'shiftDate',
      key: 'shiftDate',
      render: (value) => formatAdminDate(value),
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
      // Worker/admin-entered Manual hours override the GPS duration for the day;
      // flag them so the log makes clear where the number came from.
      render: (_, shift) => (shift.manualDurationMs != null ? (
        <span>
          {formatDuration(shift.manualDurationMs)}{' '}
          <Tag color="orange" className="status-tag">{t('Manual')}</Tag>
        </span>
      ) : formatDuration(shift.durationMs || 0)),
    },
    {
      title: t('Location'),
      dataIndex: 'location',
      key: 'location',
      render: (value) => value || '-',
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
  ];

  return (
    <AdminTable
      dataSource={filteredShifts}
      columns={columns}
      rowKey="id"
      loading={loading}
      projectFilter={toolbarStart}
      onRow={(record) => ({
        onClick: () => navigate(`./${record.id}`),
        style: { cursor: 'pointer' },
      })}
    />
  );
}
