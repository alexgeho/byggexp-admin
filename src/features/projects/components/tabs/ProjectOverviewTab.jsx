import { useEffect, useMemo } from 'react';
import { Card, Progress, Tag } from 'antd';
import { Button } from '@/src/ui-kit';
import StatIcon from '@/src/shared/components/StatIcon';
import { useCompaniesInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useShiftStore } from '@/src/store/shiftStore';
import { getProjectStatusColor, getProjectStatusLabel } from '@/src/utils/projectStatus';
import { formatProjectOverviewDate } from '@/src/features/projects/utils/projectDetailUtils';
import ProjectOverviewSections from '@/src/features/projects/components/tabs/ProjectOverviewSections';

const formatHours = (durationMs = 0) => {
  const hours = Math.round((durationMs / 3600000) * 10) / 10;
  return `${hours || 0}h`;
};

const isCompletedTask = (task) => task?.status === 'completed';

function OverviewInfoRow({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <div className="project-overview-info__row">
      <span className="project-overview-info__label">{label}</span>
      <span className="project-overview-info__value">{value}</span>
    </div>
  );
}

function ProjectOverviewStatItem({ color, icon, label, value }) {
  return (
    <div className="project-overview-stats__item">
      <span className={`project-overview-stats__icon project-overview-stats__icon--${color}`}>
        {icon}
      </span>
      <span className="project-overview-stats__content">
        <span className="project-overview-stats__label">{label}</span>
        <strong className="project-overview-stats__value">{value}</strong>
      </span>
    </div>
  );
}

export default function ProjectOverviewTab({
  project,
  projectId,
  onEditInformation,
  onNavigateTab,
}) {
  const { shifts, fetchAllAccessible } = useShiftStore();

  const companyId = typeof project?.companyId === 'object'
    ? project?.companyId?._id
    : (project?.companyId || project?.clientCompanyId);
  const { companies } = useCompaniesInfo([companyId].filter(Boolean));

  useEffect(() => {
    if (!projectId) {
      return;
    }

    void fetchAllAccessible({ projectId });
  }, [fetchAllAccessible, projectId]);

  const company = companies[companyId]
    || (typeof project?.companyId === 'object' ? project.companyId : null)
    || (typeof project?.clientCompanyId === 'object' ? project.clientCompanyId : null);
  const displayProjectId = projectId || project?._id || project?.id;
  const startDate = formatProjectOverviewDate(project?.beginningDate);
  const deadline = formatProjectOverviewDate(project?.endDate);
  const tasks = project?.tasks || [];
  const totalWorkers = project?.workers?.length || 0;
  const activeTasks = tasks.filter((task) => !isCompletedTask(task)).length;
  const completedTasks = tasks.filter(isCompletedTask).length;
  const totalHours = useMemo(
    () => shifts.reduce((sum, shift) => sum + (Number(shift.durationMs) || 0), 0),
    [shifts],
  );

  const stats = useMemo(() => ([
    {
      key: 'workers',
      label: 'Total workers',
      value: totalWorkers,
      icon: <StatIcon name="users" />,
      color: 'blue',
    },
    {
      key: 'hours',
      label: 'Total hours',
      value: formatHours(totalHours),
      icon: <StatIcon name="clock" />,
      color: 'blue',
    },
    {
      key: 'active-tasks',
      label: 'Active tasks',
      value: activeTasks,
      icon: <StatIcon name="check-circle" />,
      color: 'orange',
    },
    {
      key: 'completed-tasks',
      label: 'Completed tasks',
      value: completedTasks,
      icon: <StatIcon name="check-circle" />,
      color: 'green',
    },
  ]), [activeTasks, completedTasks, totalHours, totalWorkers]);

  return (
    <div className="project-overview-tab">
      <div className="project-overview">
        <Card
          className="dashboard-section-card project-overview__info-card"
          title="Project overview"
          extra={(
            <Button
              className="project-overview__edit-button"
              variant="secondary"
              onClick={onEditInformation}
            >
              Edit information
            </Button>
          )}
        >
          <div className="project-overview-info">
            <OverviewInfoRow label="Client" value={company?.name} />
            <OverviewInfoRow label="Project ID" value={displayProjectId} />
            <OverviewInfoRow label="Address" value={project?.location} />
            <OverviewInfoRow
              label="Status"
              value={project?.status ? (
                <Tag className="status-tag" color={getProjectStatusColor(project.status)}>
                  {getProjectStatusLabel(project.status)}
                </Tag>
              ) : null}
            />
            <OverviewInfoRow label="Start date" value={startDate} />
            <OverviewInfoRow label="Deadline" value={deadline} />
            <OverviewInfoRow label="Description" value={project?.description} />
          </div>
        </Card>

        <div className="project-overview__right">
          <Card className="project-overview__stats-card">
            <div className="project-overview-stats">
              {stats.map((stat) => (
                <ProjectOverviewStatItem key={stat.key} {...stat} />
              ))}
            </div>
          </Card>

          <Card
            className="dashboard-section-card project-overview__progress-card"
            title="Progress"
          >
            <div className="project-overview-progress">
              <div className="project-overview-progress__header">
                <span className="project-overview-progress__label">Overall completion</span>
                <span className="project-overview-progress__value">50%</span>
              </div>
              <Progress
                className="project-overview-progress__bar"
                percent={50}
                showInfo={false}
                strokeColor="#0089f6"
                trailColor="#e7ecf0"
              />
            </div>
          </Card>
        </div>
      </div>

      <ProjectOverviewSections
        project={project}
        projectId={projectId}
        shifts={shifts}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
}
