import { useEffect, useMemo, useState } from 'react';
import { Avatar, Tag } from 'antd';
import { useNavigate, useOutletContext } from '@/src/shared/routing/routerCompat';
import apiClient from '@/src/api/apiClient';
import { useProjectsInfo, useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import { useShiftStore } from '@/src/store/shiftStore';
import AdminTable from '@/src/shared/components/AdminTable';
import { getShiftStatusColor, getShiftStatusLabel } from '@/src/utils/shiftStatus';
import { formatAdminDate, formatAdminDateTime } from '@/src/utils/formatDateTime';
import { matchesEntityId } from '@/src/utils/entityId';
import ToolPhotoStrip from '@/src/features/tools/components/ToolPhotoStrip';
import { resolveDocumentUrl } from '@/src/features/projects/utils/projectDetailUtils';

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

export default function ShiftListPage() {
  const navigate = useNavigate();
  const { shifts, loading, fetchAllAccessible } = useShiftStore();
  const [selectedProjectId, setSelectedProjectId] = useState(undefined);
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag className="status-tag" color={getShiftStatusColor(status)}>
          {getShiftStatusLabel(status)}
        </Tag>
      ),
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
      render: (value) => formatAdminDate(value),
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
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (value) => value || '-',
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
  ];

  return (
    <AdminTable
      dataSource={filteredShifts}
      columns={columns}
      rowKey="id"
      loading={loading}
      toolbarStart={toolbarStart}
      onRow={(record) => ({
        onClick: () => navigate(`./${record.id}`),
        style: { cursor: 'pointer' },
      })}
    />
  );
}
