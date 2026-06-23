'use client';

import { useEffect, useMemo } from 'react';
import { Alert, Button, Card, Col, Empty, Row, Space, Table, Tag } from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  ProjectOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useAuthStore } from '@/src/store/authStore';
import { useCompanyStore } from '@/src/store/companyStore';
import { useProjectStore } from '@/src/store/projectStore';
import { useShiftStore } from '@/src/store/shiftStore';
import { useTaskStore } from '@/src/store/taskStore';
import { useToolStore } from '@/src/store/toolStore';
import { useUserStore } from '@/src/store/userStore';
import { getEntityId } from '@/src/utils/entityId';
import { getProjectStatusColor, getProjectStatusLabel } from '@/src/utils/projectStatus';
import { getShiftStatusColor, getShiftStatusLabel } from '@/src/utils/shiftStatus';

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

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const formatHours = (durationMs = 0) => {
  const hours = Math.round((durationMs / 3600000) * 10) / 10;
  return `${hours || 0}h`;
};

const isOpenTask = (task) => !['done', 'completed', 'closed'].includes(String(task?.status || '').toLowerCase());

function StatCard({ color, icon, label, value, hint }) {
  return (
    <Card className="dashboard-stat-card">
      <Space size={16} align="start">
        <span className={`dashboard-stat-card__icon dashboard-stat-card__icon--${color}`}>
          {icon}
        </span>
        <span>
          <span className="dashboard-stat-card__label">{label}</span>
          <strong className="dashboard-stat-card__value">{value}</strong>
          {hint ? <span className="dashboard-stat-card__hint">{hint}</span> : null}
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
      extra={actionHref ? <Link href={actionHref}>{actionLabel}</Link> : null}
    >
      {children}
    </Card>
  );
}

export default function DashboardPage({ section }) {
  const user = useAuthStore((state) => state.user);
  const links = SECTION_LINKS[section] || SECTION_LINKS.admin;

  const { companies, fetchAll: fetchCompanies } = useCompanyStore();
  const { projects, loading: projectsLoading, fetchAll, fetchByCompany: fetchProjectsByCompany, fetchMy } = useProjectStore();
  const { shifts, fetchAllAccessible: fetchShifts } = useShiftStore();
  const { tasks, fetchAllAccessible: fetchTasks } = useTaskStore();
  const { tools, fetchAllAccessible: fetchTools } = useToolStore();
  const { users, fetchAll: fetchUsers, fetchByCompany: fetchUsersByCompany } = useUserStore();

  const canSeeCompanyScope = user?.role === 'superadmin' || user?.role === 'companyAdmin';
  const canSeeAdminScope = user?.role === 'superadmin';

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadDashboard = async () => {
      const requests = [fetchTasks().catch(() => null), fetchShifts().catch(() => null)];

      if (user.role === 'superadmin') {
        requests.push(fetchAll().catch(() => null));
        requests.push(fetchUsers({ silent: true }).catch(() => null));
        requests.push(fetchCompanies().catch(() => null));
        requests.push(fetchTools().catch(() => null));
      } else if (user.role === 'companyAdmin' && user.companyId) {
        requests.push(fetchProjectsByCompany(user.companyId).catch(() => null));
        requests.push(fetchUsersByCompany(user.companyId, { silent: true }).catch(() => null));
        requests.push(fetchTools().catch(() => null));
      } else {
        requests.push(fetchMy().catch(() => null));
      }

      await Promise.all(requests);
    };

    loadDashboard();
  }, [
    fetchAll,
    fetchCompanies,
    fetchMy,
    fetchProjectsByCompany,
    fetchShifts,
    fetchTasks,
    fetchTools,
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
    const today = new Date().toDateString();
    return shifts
      .filter((shift) => new Date(shift.startedAt || shift.date || shift.createdAt).toDateString() === today)
      .reduce((sum, shift) => sum + (Number(shift.durationMs) || 0), 0);
  }, [shifts]);

  const upcomingTasks = useMemo(() => [...openTasks]
    .filter((task) => task.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 6), [openTasks]);

  const recentShifts = useMemo(() => [...shifts]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 6), [shifts]);

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
      render: formatDate,
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

  const shiftColumns = [
    {
      title: 'Worker',
      key: 'worker',
      render: (_, shift) => shift.user?.name || shift.workerName || shift.userName || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={getShiftStatusColor(status)}>{getShiftStatusLabel(status)}</Tag>,
    },
    {
      title: 'Hours',
      dataIndex: 'durationMs',
      key: 'durationMs',
      align: 'right',
      render: formatHours,
    },
  ];

  const stats = [
    {
      label: 'Active projects',
      value: activeProjects.length,
      hint: `${projects.length} total`,
      icon: <ProjectOutlined />,
      color: 'blue',
    },
    {
      label: canSeeCompanyScope ? 'Workers online' : 'Active shifts',
      value: activeShifts.length,
      hint: canSeeCompanyScope ? `${users.length} personnel` : `${shifts.length} shifts tracked`,
      icon: <TeamOutlined />,
      color: 'green',
    },
    {
      label: 'Open tasks',
      value: openTasks.length,
      hint: `${tasks.length} total`,
      icon: <CheckCircleOutlined />,
      color: 'orange',
    },
    {
      label: canSeeAdminScope ? 'Companies' : 'Hours today',
      value: canSeeAdminScope ? companies.length : formatHours(totalHoursToday),
      hint: canSeeAdminScope ? `${tools.length} instruments` : 'Reported work',
      icon: canSeeAdminScope ? <FolderOpenOutlined /> : <ClockCircleOutlined />,
      color: 'purple',
    },
  ];

  return (
    <div className="dashboard-overview">
      <div className="dashboard-overview__hero">
        <div>
          <span className="dashboard-overview__eyebrow">Dashboard</span>
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
          message="No dashboard data yet"
          description="Create projects, tasks, users or shifts to populate this overview."
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <SectionCard title="Project overview" actionHref={links.projects}>
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
          <SectionCard title="Upcoming deadlines" actionHref={links.tasks}>
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
          <SectionCard title={canSeeCompanyScope ? 'Personnel overview' : 'Shift overview'} actionHref={links.shifts}>
            {recentShifts.length ? (
              <Table
                className="dashboard-overview__table"
                columns={shiftColumns}
                dataSource={recentShifts}
                pagination={false}
                rowKey={(shift) => getEntityId(shift) || `${shift.userName}-${shift.startedAt}`}
                size="small"
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No shift activity" />
            )}
          </SectionCard>
        </Col>

        <Col xs={24} xl={12}>
          <SectionCard title="Quick actions">
            <div className="dashboard-overview__quick-actions">
              {links.projects ? <Button icon={<ProjectOutlined />} href={links.projects}>View projects</Button> : null}
              {links.users ? <Button icon={<TeamOutlined />} href={links.users}>View personnel</Button> : null}
              {links.tasks ? <Button icon={<CheckCircleOutlined />} href={links.tasks}>View tasks</Button> : null}
              {links.tools ? <Button icon={<ToolOutlined />} href={links.tools}>View instruments</Button> : null}
            </div>
          </SectionCard>
        </Col>
      </Row>
    </div>
  );
}
