import { Avatar, Tag } from 'antd';
import {
  CalendarOutlined,
  EnvironmentOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { getProjectStatusColor, getProjectStatusLabel } from '@/src/utils/projectStatus';
import {
  formatProjectDateRange,
  resolveProjectPerson,
} from '@/src/features/projects/utils/projectDetailUtils';
import apiClient from '@/src/api/apiClient';

const resolveAvatarUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, apiClient.defaults.baseURL).toString();
  } catch {
    return url;
  }
};

export default function ProjectDetailHeader({
  project,
  owner,
  manager,
}) {
  const ownerPerson = owner || resolveProjectPerson(project?.ownerId);
  const managerPerson = manager || resolveProjectPerson(project?.projectManagerId);
  const dateRange = formatProjectDateRange(project?.beginningDate, project?.endDate);
  const managerAvatarUrl = resolveAvatarUrl(managerPerson?.avatarUrl);

  return (
    <header className="project-detail-header">
      <div className="project-detail-header__title-row">
        <h1 className="project-detail-header__title">{project.name}</h1>
        <Tag
          className="project-detail-header__status"
          color={getProjectStatusColor(project.status)}
        >
          {getProjectStatusLabel(project.status)}
        </Tag>
      </div>

      <div className="project-detail-header__meta">
        {project.location ? (
          <div className="project-detail-header__meta-item">
            <EnvironmentOutlined className="project-detail-header__meta-icon" />
            <span>{project.location}</span>
          </div>
        ) : null}

        {dateRange ? (
          <div className="project-detail-header__meta-item">
            <CalendarOutlined className="project-detail-header__meta-icon" />
            <span>{dateRange}</span>
          </div>
        ) : null}

        {ownerPerson?.name ? (
          <div className="project-detail-header__meta-item">
            <UserOutlined className="project-detail-header__meta-icon" />
            <span>Owner: {ownerPerson.name}</span>
          </div>
        ) : null}

        {managerPerson?.name ? (
          <div className="project-detail-header__meta-item project-detail-header__meta-item--manager">
            <span>Project manager:</span>
            <Avatar
              size={24}
              src={managerAvatarUrl}
              className="project-detail-header__manager-avatar"
            >
              {managerPerson.name.slice(0, 1).toUpperCase()}
            </Avatar>
            <span>{managerPerson.name}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
