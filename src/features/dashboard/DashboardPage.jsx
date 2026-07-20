'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Button, Card, Col, Empty, Row, Space, Table, Tag } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import apiClient from '@/src/api/apiClient';
import LiveStatusCell from '@/src/shared/components/LiveStatusCell';
import { useLiveWorkData } from '@/src/shared/hooks/useLiveWorkData';
import { useAuthStore } from '@/src/store/authStore';
import { useProjectStore } from '@/src/store/projectStore';
import { useShiftStore } from '@/src/store/shiftStore';
import { useTaskStore } from '@/src/store/taskStore';
import { useUserStore } from '@/src/store/userStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatDuration } from '@/src/utils/formatDuration';
import { getProjectStatusColor, getProjectStatusLabel } from '@/src/utils/projectStatus';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const SECTION_LINKS = {
  admin: {
    projects: '/admin/projects',
    users: '/admin/users',
    companies: '/admin/companies',
    tasks: '/admin/tasks',
    tools: '/admin/tools',
    shifts: '/admin/shifts',
    schedule: '/admin/schedule',
  },
  company: {
    projects: '/company/projects',
    users: '/company/users',
    tasks: '/company/tasks',
    tools: '/company/tools',
    shifts: '/company/shifts',
    schedule: '/company/schedule',
  },
  projects: {
    projects: '/projects/my',
  },
  worker: {
    projects: '/worker/my',
    shifts: '/worker/time-report',
  },
};

const getDisplayName = (record, fallback = 'Untitled') =>
  record?.name || record?.title || record?.projectName || record?.companyName || fallback;

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

const formatHours = (durationMs = 0) => {
  const hours = Math.round((durationMs / 3600000) * 10) / 10;
  return `${hours || 0}h`;
};

const formatRelativeTime = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSeconds < 60) {
    return 'Just now';
  }

  const units = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'min', seconds: 60 },
  ];

  const unit = units.find((item) => diffSeconds >= item.seconds);
  const valueCount = Math.floor(diffSeconds / unit.seconds);
  const label = unit.label === 'min' || valueCount === 1 ? unit.label : `${unit.label}s`;

  return `${valueCount} ${label} ago`;
};

const isOpenTask = (task) => !['done', 'completed', 'closed'].includes(String(task?.status || '').toLowerCase());

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const addDays = (date, amount) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
};

const getRecordDateKey = (record, fields) => {
  for (const field of fields) {
    const value = record?.[field];

    if (!value) {
      continue;
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return formatDateKey(date);
    }
  }

  return null;
};

const countRecordsByDate = (records, date, fields, predicate = () => true) => {
  const dateKey = formatDateKey(date);

  return records.filter((record) => (
    predicate(record) && getRecordDateKey(record, fields) === dateKey
  )).length;
};

const sumShiftDurationByDate = (shifts, date) => {
  const dateKey = formatDateKey(date);

  return shifts
    .filter((shift) => getRecordDateKey(shift, ['shiftDate', 'startedAt', 'date', 'createdAt']) === dateKey)
    .reduce((sum, shift) => sum + (Number(shift.durationMs) || 0), 0);
};

const getDifference = (todayValue, yesterdayValue) => todayValue - yesterdayValue;

const formatTrendHours = (durationMs) => {
  const hours = Math.round((durationMs / 3600000) * 10) / 10;

  return hours || 0;
};

function StatIcon({ name }) {
  const iconProps = {
    className: 'dashboard-stat-card__icon-image',
    fill: 'none',
    viewBox: '0 0 24 24',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
  };
  const pathProps = {
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  if (name === 'briefcase') {
    return (
      <svg {...iconProps}>
        <path d="M9 6V5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V6" {...pathProps} />
        <path d="M4 8.5C4 7.39543 4.89543 6.5 6 6.5H18C19.1046 6.5 20 7.39543 20 8.5V17.5C20 18.6046 19.1046 19.5 18 19.5H6C4.89543 19.5 4 18.6046 4 17.5V8.5Z" {...pathProps} />
        <path d="M4 11.5H20" {...pathProps} />
        <path d="M10 11.5V12.5C10 13.0523 10.4477 13.5 11 13.5H13C13.5523 13.5 14 13.0523 14 12.5V11.5" {...pathProps} />
      </svg>
    );
  }

  if (name === 'users') {
    return (
      <svg {...iconProps}>
        <path d="M16.5 19.5V18C16.5 16.3431 15.1569 15 13.5 15H7.5C5.84315 15 4.5 16.3431 4.5 18V19.5" {...pathProps} />
        <path d="M10.5 12C12.1569 12 13.5 10.6569 13.5 9C13.5 7.34315 12.1569 6 10.5 6C8.84315 6 7.5 7.34315 7.5 9C7.5 10.6569 8.84315 12 10.5 12Z" {...pathProps} />
        <path d="M20 19.5V18C19.999 16.6168 19.0592 15.4112 17.7188 15.075" {...pathProps} />
        <path d="M15.2188 6.075C16.5631 6.40869 17.5064 7.61626 17.5064 9.0025C17.5064 10.3887 16.5631 11.5963 15.2188 11.93" {...pathProps} />
      </svg>
    );
  }

  if (name === 'check-circle') {
    return (
      <svg {...iconProps}>
        <path d="M21 11.08V12C20.9988 14.1564 20.3005 16.2547 19.0093 17.9818C17.7182 19.7088 15.9033 20.9725 13.8354 21.5839C11.7674 22.1953 9.55726 22.1219 7.53447 21.3746C5.51168 20.6273 3.78465 19.2461 2.61096 17.4371C1.43727 15.628 0.879791 13.4881 1.02168 11.3363C1.16356 9.18455 1.99721 7.13631 3.39828 5.49706C4.79935 3.85781 6.69279 2.71537 8.79619 2.24013C10.8996 1.7649 13.1003 1.98232 15.07 2.86" {...pathProps} />
        <path d="M21 4L12 13.01L9.30005 10.31" {...pathProps} />
      </svg>
    );
  }

  return (
    <svg {...iconProps}>
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" {...pathProps} />
      <path d="M12 6V12L16 14" {...pathProps} />
    </svg>
  );
}

function StatTrend({ value, label = 'today', formatter = (trendValue) => trendValue }) {
  const numericValue = Number(value) || 0;
  const isNegative = numericValue < 0;
  const TrendIcon = isNegative ? ArrowDownOutlined : ArrowUpOutlined;
  const formattedValue = `${numericValue > 0 ? '+' : ''}${formatter(numericValue)} ${label}`;

  return (
    <span className={`dashboard-stat-card__trend dashboard-stat-card__trend--${isNegative ? 'negative' : 'positive'}`}>
      <TrendIcon />
      {formattedValue}
    </span>
  );
}

function StatCard({ color, icon, label, value, trendValue, trendLabel, trendFormatter }) {
  return (
    <Card className="dashboard-stat-card">
      <Space size={16} align="start">
        <span className={`dashboard-stat-card__icon dashboard-stat-card__icon--${color}`}>
          {icon}
        </span>
        <span>
          <span className="dashboard-stat-card__label">{label}</span>
          <strong className="dashboard-stat-card__value">{value}</strong>
          <StatTrend value={trendValue} label={trendLabel} formatter={trendFormatter} />
        </span>
      </Space>
    </Card>
  );
}

function SectionCard({ title, actionHref, actionLabel = 'View all', children }) {
  return (
    <Card
      className="dashboard-section-card"
      title={title}
      extra={actionHref ? (
        <Link href={actionHref} className="dashboard-section-card__action">
          {actionLabel}
        </Link>
      ) : null}
    >
      {children}
    </Card>
  );
}

function RecentActivity({ actionHref, items }) {
  return (
    <SectionCard actionHref={actionHref} title="Recent activity">
      {items.length ? (
        <ul className="dashboard-recent-activity">
          {items.map((item) => (
            <li className="dashboard-recent-activity__item" key={item.id || item.createdAt || item.message}>
              <span className="dashboard-recent-activity__message">{item.message}</span>
              <span className="dashboard-recent-activity__time">{formatRelativeTime(item.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recent activity" />
      )}
    </SectionCard>
  );
}

function PersonnelOverview({ actionHref, columns, rows }) {
  return (
    <SectionCard actionHref={actionHref} title="Personnel overview">
      {rows.length ? (
        <Table
          className="dashboard-overview__table dashboard-personnel-overview__table"
          columns={columns}
          dataSource={rows}
          pagination={false}
          rowKey={(record) => getEntityId(record) || record.email || record.name}
          size="small"
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No personnel found" />
      )}
    </SectionCard>
  );
}

export default function DashboardPage({ section }) {
  const user = useAuthStore((state) => state.user);
  const links = SECTION_LINKS[section] || SECTION_LINKS.admin;
  const [recentActivity, setRecentActivity] = useState([]);

  const { projects, loading: projectsLoading, fetchAll, fetchByCompany: fetchProjectsByCompany, fetchMy } = useProjectStore();
  const { shifts, fetchAllAccessible: fetchShifts } = useShiftStore();
  const { tasks, fetchAllAccessible: fetchTasks } = useTaskStore();
  const { fetchAll: fetchUsers, fetchByCompany: fetchUsersByCompany } = useUserStore();
  const users = useUserStore((state) => state.users);
  const { workerShiftMap } = useLiveWorkData(Boolean(user));

  const canSeeCompanyScope = user?.role === 'superadmin' || user?.role === 'companyAdmin';
  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => addDays(today, -1), [today]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadDashboard = async () => {
      const requests = [fetchTasks().catch(() => null), fetchShifts().catch(() => null)];
      const userId = user.id || user._id || user.userId;

      if (user.role === 'superadmin') {
        requests.push(fetchAll().catch(() => null));
        requests.push(fetchUsers({ silent: true }).catch(() => null));
      } else if (user.role === 'companyAdmin' && user.companyId) {
        requests.push(fetchProjectsByCompany(user.companyId).catch(() => null));
        requests.push(fetchUsersByCompany(user.companyId, { silent: true }).catch(() => null));
      } else {
        requests.push(fetchMy().catch(() => null));
      }

      if (userId) {
        requests.push(
          apiClient
            .get(`/users/${userId}/activity-logs`, { params: { pageSize: 6 } })
            .then((res) => setRecentActivity(res.data?.items || []))
            .catch(() => setRecentActivity([])),
        );
      } else {
        setRecentActivity([]);
      }

      await Promise.all(requests);
    };

    loadDashboard();
  }, [
    fetchAll,
    fetchMy,
    fetchProjectsByCompany,
    fetchShifts,
    fetchTasks,
    fetchUsers,
    fetchUsersByCompany,
    user,
  ]);

  const activeProjects = useMemo(
    () => projects.filter((project) => !['completed', 'done'].includes(String(project.status || '').toLowerCase())),
    [projects],
  );

  const activeShifts = useMemo(
    () => shifts.filter((shift) => ['active', 'paused'].includes(String(shift.status || '').toLowerCase())),
    [shifts],
  );

  const openTasks = useMemo(() => tasks.filter(isOpenTask), [tasks]);

  const totalHoursToday = useMemo(() => {
    return sumShiftDurationByDate(shifts, today);
  }, [shifts, today]);

  const totalHoursYesterday = useMemo(() => {
    return sumShiftDurationByDate(shifts, yesterday);
  }, [shifts, yesterday]);

  const projectTrendValue = useMemo(() => {
    const todayCount = countRecordsByDate(projects, today, ['createdAt', 'updatedAt', 'date'], (project) => (
      !['completed', 'done'].includes(String(project.status || '').toLowerCase())
    ));
    const yesterdayCount = countRecordsByDate(projects, yesterday, ['createdAt', 'updatedAt', 'date'], (project) => (
      !['completed', 'done'].includes(String(project.status || '').toLowerCase())
    ));

    return getDifference(todayCount, yesterdayCount);
  }, [projects, today, yesterday]);

  const shiftTrendValue = useMemo(() => {
    const fields = ['shiftDate', 'startedAt', 'date', 'createdAt'];

    return getDifference(
      countRecordsByDate(activeShifts, today, fields),
      countRecordsByDate(activeShifts, yesterday, fields),
    );
  }, [activeShifts, today, yesterday]);

  const taskTrendValue = useMemo(() => {
    const fields = ['createdAt', 'updatedAt', 'startDate', 'dueDate'];

    return getDifference(
      countRecordsByDate(openTasks, today, fields),
      countRecordsByDate(openTasks, yesterday, fields),
    );
  }, [openTasks, today, yesterday]);

  const hoursTrendValue = useMemo(() => {
    return getDifference(totalHoursToday, totalHoursYesterday);
  }, [totalHoursToday, totalHoursYesterday]);

  const upcomingTasks = useMemo(() => [...openTasks]
    .filter((task) => task.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 6), [openTasks]);

  const projectMap = useMemo(() => projects.reduce((map, project) => {
    const projectId = getEntityId(project);

    if (projectId) {
      map[projectId] = project;
    }

    return map;
  }, {}), [projects]);

  const getPersonnelProjectName = (person) => {
    const userId = getEntityId(person);
    const liveShift = workerShiftMap[userId]?.shifts?.[0];
    const projectId = person.workStatusProjectId || liveShift?.projectId || person.projectIds?.[0];

    return (
      person.workStatusProjectName ||
      liveShift?.projectName ||
      projectMap[projectId]?.name ||
      '-'
    );
  };

  const personnelRows = useMemo(() => users.slice(0, 6), [users]);

  const personnelColumns = [
    {
      title: 'Employee',
      dataIndex: 'name',
      key: 'employee',
      render: (_, person) => {
        const avatarUrl = resolveUrl(person.avatarUrl);
        const displayName = person.name || person.email || 'Employee';

        return (
          <span className="dashboard-personnel-employee">
            <Avatar size={29} src={avatarUrl} className="dashboard-personnel-employee__avatar">
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <span className="dashboard-personnel-employee__name">{displayName}</span>
          </span>
        );
      },
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => role || '-',
    },
    {
      title: 'Project',
      key: 'project',
      render: (_, person) => getPersonnelProjectName(person),
    },
    {
      title: 'Status',
      key: 'status',
      width: 220,
      render: (_, person) => (
        <LiveStatusCell
          user={person}
          workerShiftInfo={workerShiftMap[getEntityId(person)]}
        />
      ),
    },
    {
      title: "Today's hours",
      key: 'todaysHours',
      align: 'right',
      render: (_, person) => {
        const durationMs = workerShiftMap[getEntityId(person)]?.totalDurationMs || 0;

        return person.role === 'worker' ? formatDuration(durationMs) : '-';
      },
    },
  ];

  const projectColumns = [
    {
      title: 'Project',
      dataIndex: 'name',
      key: 'name',
      render: (_, project) => getDisplayName(project, 'Project'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getProjectStatusColor(status)}>{getProjectStatusLabel(status)}</Tag>
      ),
    },
    {
      title: 'Workers',
      key: 'workers',
      align: 'right',
      render: (_, project) => project.workersCount || project.workers?.length || project.assignedUsers?.length || '-',
    },
  ];

  const taskColumns = [
    {
      title: 'Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: formatAdminDate,
    },
    {
      title: 'Task',
      dataIndex: 'title',
      key: 'title',
      render: (_, task) => getDisplayName(task, 'Task'),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => <Tag color={priority === 'high' ? 'red' : priority === 'medium' ? 'orange' : 'blue'}>{priority || 'Normal'}</Tag>,
    },
  ];

  const personnelLink = links.users || links.projects || links.shifts;
  const activityLink = useMemo(() => {
    const userId = user?.id || user?._id || user?.userId;

    if (section === 'admin' && userId) {
      return `/admin/users/${userId}`;
    }

    if (section === 'company' && userId) {
      return `/company/users/${userId}`;
    }

    return links.shifts || links.projects;
  }, [links.projects, links.shifts, section, user]);

  const projectLink = links.projects;
  const tasksLink = links.tasks || links.projects;

  const stats = [
    {
      label: 'Active projects',
      value: activeProjects.length,
      trendValue: projectTrendValue,
      trendLabel: 'today',
      icon: <StatIcon name="briefcase" />,
      color: 'blue',
    },
    {
      label: canSeeCompanyScope ? 'Workers online' : 'Active shifts',
      value: activeShifts.length,
      trendValue: shiftTrendValue,
      trendLabel: 'today',
      icon: <StatIcon name="users" />,
      color: 'green',
    },
    {
      label: 'Open tasks',
      value: openTasks.length,
      trendValue: taskTrendValue,
      trendLabel: 'today',
      icon: <StatIcon name="check-circle" />,
      color: 'orange',
    },
    {
      label: 'Hours of work today',
      value: formatHours(totalHoursToday),
      trendValue: hoursTrendValue,
      trendLabel: 'h today',
      trendFormatter: formatTrendHours,
      icon: <StatIcon name="clock" />,
      color: 'purple',
    },
  ];

  return (
    <div className="dashboard-overview">
      <div className="dashboard-overview__hero">
        <div>
          <h2>Good morning, {user?.name?.split(' ')?.[0] || 'there'}</h2>
          <p>Here is what is happening across your projects today.</p>
        </div>
        {links.schedule ? (
          <Button icon={<CalendarOutlined />} href={links.schedule}>
            Open calendar
          </Button>
        ) : null}
      </div>

      <Row gutter={[16, 16]} className="dashboard-overview__stats">
        {stats.map((stat) => (
          <Col xs={24} md={12} xl={6} key={stat.label}>
            <StatCard {...stat} />
          </Col>
        ))}
      </Row>

      {!projectsLoading && !projects.length && !tasks.length && !shifts.length ? (
        <Alert
          className="dashboard-overview__empty-alert"
          type="info"
          showIcon
          title="No dashboard data yet"
          description="Create projects, tasks, users or shifts to populate this overview."
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <PersonnelOverview
            actionHref={personnelLink}
            columns={personnelColumns}
            rows={personnelRows}
          />
        </Col>

        <Col xs={24} xl={12}>
          <SectionCard actionHref={tasksLink} title="Upcoming deadlines">
            {upcomingTasks.length ? (
              <Table
                className="dashboard-overview__table"
                columns={taskColumns}
                dataSource={upcomingTasks}
                pagination={false}
                rowKey={(task) => getEntityId(task) || getDisplayName(task)}
                size="small"
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No upcoming deadlines" />
            )}
          </SectionCard>
        </Col>

        <Col xs={24} xl={12}>
          <SectionCard actionHref={projectLink} title="Project overview">
            {projects.length ? (
              <Table
                className="dashboard-overview__table"
                columns={projectColumns}
                dataSource={projects.slice(0, 6)}
                pagination={false}
                rowKey={(project) => getEntityId(project) || getDisplayName(project)}
                size="small"
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No projects found" />
            )}
          </SectionCard>
        </Col>

        <Col xs={24} xl={12}>
          <RecentActivity actionHref={activityLink} items={recentActivity} />
        </Col>

      </Row>
    </div>
  );
}
