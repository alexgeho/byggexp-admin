import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Empty, Image, Table, Tag, Typography } from 'antd';
import apiClient from '@/src/api/apiClient';
import { useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { formatAdminDate, formatAdminDateTime } from '@/src/utils/formatDateTime';
import { getShiftStatusColor, getShiftStatusLabel } from '@/src/utils/shiftStatus';
import {
  normalizeProjectDocuments,
  resolveDocumentUrl,
} from '@/src/features/projects/utils/projectDetailUtils';

const PREVIEW_LIMIT = 5;
const PHOTO_PREVIEW_LIMIT = 2;

const isImageFile = (file) => {
  const mimeType = file?.mimeType || '';
  const url = file?.url || '';
  return mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(url);
};

const getTaskDisplayStatus = (task) => {
  if (task?.status === 'completed') {
    return { label: 'Completed', color: 'green' };
  }

  const dueTime = task?.dueDate ? new Date(task.dueDate).getTime() : null;
  if (dueTime && !Number.isNaN(dueTime) && dueTime < Date.now()) {
    return { label: 'Overdue', color: 'red' };
  }

  return { label: 'Open', color: 'blue' };
};

const formatDocumentDate = (value) => formatAdminDateTime(value);

function OverviewSectionCard({ title, onViewAll, children }) {
  return (
    <Card
      className="dashboard-section-card project-overview-section-card"
      title={title}
      extra={onViewAll ? (
        <button
          type="button"
          className="dashboard-section-card__action"
          onClick={onViewAll}
        >
          View all
        </button>
      ) : null}
    >
      {children}
    </Card>
  );
}

export default function ProjectOverviewSections({
  project,
  projectId,
  shifts,
  onNavigateTab,
}) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);

  const tasks = project?.tasks || [];

  const taskUserIds = useMemo(
    () => tasks
      .map((task) => (
        typeof task.assigneeUserId === 'object'
          ? task.assigneeUserId?._id
          : task.assigneeUserId
      ))
      .filter(Boolean),
    [tasks],
  );

  const shiftWorkerIds = useMemo(
    () => shifts.map((shift) => shift.workerId).filter(Boolean),
    [shifts],
  );

  const { users: taskUsers } = useUsersInfo(taskUserIds);
  const { users: shiftUsers } = useUsersInfo(shiftWorkerIds);

  const loadTeam = useCallback(async () => {
    if (!projectId) {
      setTeamMembers([]);
      return;
    }

    setTeamLoading(true);
    try {
      const { data } = await apiClient.get(`/users/project/${projectId}`);
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load project team:', error);
      setTeamMembers([]);
    } finally {
      setTeamLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const previewTasks = useMemo(
    () => [...tasks]
      .sort((left, right) => {
        if (left.status === 'completed' && right.status !== 'completed') {
          return 1;
        }

        if (left.status !== 'completed' && right.status === 'completed') {
          return -1;
        }

        const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Number.POSITIVE_INFINITY;
        return leftDue - rightDue;
      })
      .slice(0, PREVIEW_LIMIT),
    [tasks],
  );

  const previewShifts = useMemo(
    () => [...shifts]
      .sort((left, right) => {
        const leftTime = new Date(left.startedAt || left.shiftDate || 0).getTime();
        const rightTime = new Date(right.startedAt || right.shiftDate || 0).getTime();
        return rightTime - leftTime;
      })
      .slice(0, PREVIEW_LIMIT),
    [shifts],
  );

  const previewPhotos = useMemo(
    () => shifts.flatMap((shift) => (
      (shift.photos || [])
        .filter(isImageFile)
        .map((photo, index) => ({
          key: `${shift.id}-${photo.url || index}`,
          url: resolveDocumentUrl(photo.url),
          shiftDate: shift.shiftDate,
          workerName: shift.workerName,
          sortTime: new Date(shift.startedAt || shift.shiftDate || 0).getTime(),
        }))
    ))
      .filter((photo) => photo.url)
      .sort((left, right) => right.sortTime - left.sortTime)
      .slice(0, PHOTO_PREVIEW_LIMIT),
    [shifts],
  );

  const previewDocuments = useMemo(
    () => normalizeProjectDocuments(project?.documents || []).slice(0, PREVIEW_LIMIT),
    [project?.documents],
  );

  const previewTeam = useMemo(
    () => teamMembers.slice(0, PREVIEW_LIMIT),
    [teamMembers],
  );

  const taskColumns = [
    {
      title: 'Task',
      dataIndex: 'taskTitle',
      key: 'taskTitle',
    },
    {
      title: 'Assignee',
      key: 'assignee',
      render: (_, task) => {
        const userId = typeof task.assigneeUserId === 'object'
          ? task.assigneeUserId?._id
          : task.assigneeUserId;
        return task.assigneeUserName || taskUsers[userId]?.name || '-';
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, task) => {
        const status = getTaskDisplayStatus(task);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
  ];

  const shiftColumns = [
    {
      title: 'Worker',
      key: 'worker',
      render: (_, shift) => shiftUsers[shift.workerId]?.name || shift.workerName || shift.workerId || '-',
    },
    {
      title: 'Date',
      dataIndex: 'shiftDate',
      key: 'shiftDate',
      render: (value) => formatAdminDate(value),
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

  const documentColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, document) => (
        document.url ? (
          <Typography.Link href={document.url} target="_blank" rel="noreferrer">
            {name}
          </Typography.Link>
        ) : name
      ),
    },
    {
      title: 'Uploaded by',
      dataIndex: 'uploadedByName',
      key: 'uploadedByName',
      render: (value) => value || '-',
    },
    {
      title: 'Date',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      render: formatDocumentDate,
    },
  ];

  const teamColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => <Tag className="pill-tag">{role}</Tag>,
    },
  ];

  return (
    <div className="project-overview-sections">
      <div className="project-overview-sections__row project-overview-sections__row--half">
        <OverviewSectionCard title="Tasks" onViewAll={() => onNavigateTab?.('tasks')}>
          {previewTasks.length ? (
            <Table
              className="dashboard-overview__table"
              columns={taskColumns}
              dataSource={previewTasks}
              pagination={false}
              rowKey={(task) => task._id || task.id || task.taskTitle}
              size="small"
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks yet" />
          )}
        </OverviewSectionCard>

        <OverviewSectionCard title="Shifts" onViewAll={() => onNavigateTab?.('shifts')}>
          {previewShifts.length ? (
            <Table
              className="dashboard-overview__table"
              columns={shiftColumns}
              dataSource={previewShifts}
              pagination={false}
              rowKey="id"
              size="small"
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No shifts yet" />
          )}
        </OverviewSectionCard>
      </div>

      <div className="project-overview-sections__row project-overview-sections__row--third">
        <OverviewSectionCard title="Recent photos" onViewAll={() => onNavigateTab?.('photos')}>
          {previewPhotos.length ? (
            <div className="project-overview-photos">
              {previewPhotos.map((photo) => (
                <article key={photo.key} className="project-photo-card">
                  <Image
                    src={photo.url}
                    alt="Project shift photo"
                    className="project-photo-card__image"
                    rootClassName="project-photo-card__image"
                  />
                  <div className="project-photo-card__meta">
                    {photo.shiftDate || 'Shift photo'}
                    {photo.workerName ? ` · ${photo.workerName}` : ''}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No photos yet" />
          )}
        </OverviewSectionCard>

        <OverviewSectionCard title="Documents" onViewAll={() => onNavigateTab?.('documents')}>
          {previewDocuments.length ? (
            <Table
              className="dashboard-overview__table"
              columns={documentColumns}
              dataSource={previewDocuments}
              pagination={false}
              rowKey={(document) => document.id || document.name}
              size="small"
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No documents yet" />
          )}
        </OverviewSectionCard>

        <OverviewSectionCard title="Team" onViewAll={() => onNavigateTab?.('team')}>
          {previewTeam.length ? (
            <Table
              className="dashboard-overview__table"
              columns={teamColumns}
              dataSource={previewTeam}
              pagination={false}
              loading={teamLoading}
              rowKey={(member) => member._id || member.id || member.email}
              size="small"
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No team members yet" />
          )}
        </OverviewSectionCard>
      </div>
    </div>
  );
}
