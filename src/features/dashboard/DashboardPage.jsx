'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Col, Empty, Row, Table, Tag } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import LiveStatusCell from '@/src/shared/components/LiveStatusCell';
import { isShiftTrackedRole } from '@/src/utils/liveStatus';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import { EconomyBlock, PaymentsDueBlock } from '@/src/features/dashboard/EconomyOverview';
import CashflowBlock from '@/src/features/dashboard/CashflowBlock';
import WorkTimeBlock from '@/src/features/dashboard/WorkTimeBlock';
import { useEconomyData } from '@/src/features/dashboard/useEconomyData';
import { isUnpaid } from '@/src/features/purchases/paymentDue';
import BlockGrid from '@/src/shared/components/blocks/BlockGrid';
import BlockCustomizer from '@/src/shared/components/blocks/BlockCustomizer';
import OnboardingChecklist from '@/src/features/dashboard/OnboardingChecklist';
import OnboardingWizard from '@/src/features/onboarding/OnboardingWizard';
import { useDashboardLayout } from '@/src/features/dashboard/useDashboardLayout';
import { DASHBOARD_BLOCKS, DASHBOARD_BLOCK_MAP } from '@/src/features/dashboard/dashboardBlocks';
import { useT } from '@/src/i18n/LanguageProvider';
import { useLiveWorkData } from '@/src/shared/hooks/useLiveWorkData';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { useAuthStore } from '@/src/store/authStore';
import { useProjectStore } from '@/src/store/projectStore';
import { useShiftStore } from '@/src/store/shiftStore';
import { useTaskStore } from '@/src/store/taskStore';
import { useUserStore } from '@/src/store/userStore';
import { getEntityId, matchesEntityId } from '@/src/utils/entityId';
import { formatDuration } from '@/src/utils/formatDuration';
import StatusTag from '@/src/shared/components/StatusTag';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import StatIcon from '@/src/features/dashboard/components/StatIcon';
import StatCard from '@/src/features/dashboard/components/StatCard';
import SectionCard from '@/src/features/dashboard/components/SectionCard';
import RecentActivity from '@/src/features/dashboard/components/RecentActivity';
import PersonnelOverview from '@/src/features/dashboard/components/PersonnelOverview';
import {
  SECTION_LINKS, PERSONNEL_POLL_INTERVAL_MS, getDisplayName, resolveUrl, formatHours,
  isOpenTask, addDays, countRecordsByDate, sumShiftDurationByDate, getDifference, formatTrendHours,
} from '@/src/features/dashboard/dashboardUtils';

export default function DashboardPage({ section }) {
  const user = useAuthStore((state) => state.user);
  const t = useT();
  const links = SECTION_LINKS[section] || SECTION_LINKS.admin;
  const navigate = useNavigate();
  const [recentActivity, setRecentActivity] = useState([]);
  const [personnelProjectId, setPersonnelProjectId] = useState(undefined);
  const [deadlineProjectId, setDeadlineProjectId] = useState(undefined);
  const [economyProjectId, setEconomyProjectId] = useState(undefined);
  const [paymentsProjectId, setPaymentsProjectId] = useState(undefined);
  const economy = useEconomyData();
  // Hide the "Payments due" block entirely when there is nothing unpaid, so it
  // doesn't take space just to say "Nothing to pay". (React Compiler memoizes
  // this; a manual useMemo here mismatched its inferred deps and disabled it.)
  const paymentsDueCount = (economy?.data?.supplier || []).filter(
    (inv) => isUnpaid(inv) && inv.dueDate,
  ).length;

  const { projects, loading: projectsLoading, fetchAll, fetchByCompany: fetchProjectsByCompany, fetchMy } = useProjectStore();
  const { shifts, fetchAllAccessible: fetchShifts } = useShiftStore();
  const { tasks, fetchAllAccessible: fetchTasks } = useTaskStore();
  const { fetchAll: fetchUsers, fetchByCompany: fetchUsersByCompany } = useUserStore();
  const users = useUserStore((state) => state.users);
  const { workerShiftMap } = useLiveWorkData(Boolean(user));

  const layout = useDashboardLayout();
  const canSeeCompanyScope = user?.role === 'superadmin' || user?.role === 'companyAdmin';
  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => addDays(today, -1), [today]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return t('Good morning');
    if (hour < 18) return t('Good afternoon');
    return t('Good evening');
  }, [t]);

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

  // Keep the Personnel overview live: workStatus flips when a worker starts or
  // pauses a shift on mobile, and the dashboard must reflect it without a manual
  // reload (shift hours are already refreshed by useLiveWorkData).
  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const refreshPersonnel = () => {
      if (user.role === 'superadmin') {
        fetchUsers({ silent: true }).catch(() => null);
      } else if (user.role === 'companyAdmin' && user.companyId) {
        fetchUsersByCompany(user.companyId, { silent: true }).catch(() => null);
      }
    };

    const pollId = setInterval(refreshPersonnel, PERSONNEL_POLL_INTERVAL_MS);
    return () => clearInterval(pollId);
  }, [user, fetchUsers, fetchUsersByCompany]);

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
    .filter((task) => {
      if (!deadlineProjectId) {
        return true;
      }

      const projectId = typeof task.projectId === 'object' ? task.projectId?._id : task.projectId;
      return projectId && matchesEntityId({ _id: projectId }, deadlineProjectId);
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 6), [openTasks, deadlineProjectId]);

  const projectMap = useMemo(() => projects.reduce((map, project) => {
    const projectId = getEntityId(project);

    if (projectId) {
      map[projectId] = project;
    }

    return map;
  }, {}), [projects]);

  const getPersonnelProjectId = (person) => {
    const userId = getEntityId(person);
    const liveShift = workerShiftMap[userId]?.shifts?.[0];

    return person.workStatusProjectId || liveShift?.projectId || person.projectIds?.[0];
  };

  const getPersonnelProjectName = (person) => {
    const userId = getEntityId(person);
    const liveShift = workerShiftMap[userId]?.shifts?.[0];
    const projectId = getPersonnelProjectId(person);

    return (
      person.workStatusProjectName ||
      liveShift?.projectName ||
      projectMap[projectId]?.name ||
      '-'
    );
  };

  const personnelRows = useMemo(() => {
    const isWorking = (person) => (person.workStatus === 'working' ? 0 : 1);
    // Company admins work and track hours too, so they show in the personnel
    // overview. Only the platform superadmin is kept out.
    const nonStaffRoles = new Set(['superadmin']);

    return [...users]
      .filter((person) => !nonStaffRoles.has(person.role))
      .filter((person) => {
        if (!personnelProjectId) {
          return true;
        }

        const userId = getEntityId(person);
        const liveShift = workerShiftMap[userId]?.shifts?.[0];
        const projectId = person.workStatusProjectId || liveShift?.projectId || person.projectIds?.[0];

        return matchesEntityId({ _id: projectId }, personnelProjectId);
      })
      .sort((a, b) => isWorking(a) - isWorking(b))
      .slice(0, 6);
  }, [users, personnelProjectId, workerShiftMap]);

  const personnelColumns = [
    {
      title: t('Employee'),
      dataIndex: 'name',
      key: 'employee',
      render: (_, person) => {
        const avatarUrl = resolveUrl(person.avatarUrl);
        const displayName = person.name || person.email || 'Employee';
        const href = links.users ? `${links.users}/${getEntityId(person)}` : null;

        return (
          <span
            className={`dashboard-personnel-employee${href ? ' dashboard-personnel-employee--link' : ''}`}
            onClick={href ? () => navigate(href) : undefined}
          >
            <Avatar size={29} src={avatarUrl} className="dashboard-personnel-employee__avatar">
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <span className="dashboard-personnel-employee__name">{displayName}</span>
          </span>
        );
      },
    },
    {
      title: t('Status'),
      key: 'status',
      render: (_, person) => (
        <LiveStatusCell
          user={person}
          workerShiftInfo={workerShiftMap[getEntityId(person)]}
        />
      ),
    },
    {
      title: t("Today's hours"),
      key: 'todaysHours',
      align: 'right',
      render: (_, person) => {
        const durationMs = workerShiftMap[getEntityId(person)]?.totalDurationMs || 0;

        return isShiftTrackedRole(person.role) ? formatDuration(durationMs) : '-';
      },
    },
    {
      title: t('Project'),
      key: 'project',
      render: (_, person) => getPersonnelProjectName(person),
    },
    {
      title: t('Role'),
      dataIndex: 'role',
      key: 'role',
      render: (role) => role || '-',
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, person) => (
        <AdminTableActions
          items={[
            {
              key: 'view',
              label: t('View'),
              icon: <EyeOutlined />,
              onClick: links.users ? () => navigate(`${links.users}/${getEntityId(person)}`) : undefined,
            },
          ]}
        />
      ),
    },
  ];

  const projectColumns = [
    {
      title: t('Project'),
      dataIndex: 'name',
      key: 'name',
      render: (_, project) => {
        const name = getDisplayName(project, 'Project');
        const href = links.projects ? `${links.projects}/${getEntityId(project)}` : null;
        return href ? (
          <a className="dashboard-cell-link" onClick={() => navigate(href)}>{name}</a>
        ) : name;
      },
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <StatusTag status={status} />
      ),
    },
    {
      title: t('Workers'),
      key: 'workers',
      align: 'right',
      render: (_, project) => project.workersCount || project.workers?.length || project.assignedUsers?.length || '-',
    },
  ];

  const taskColumns = [
    {
      title: t('Date'),
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: formatAdminDate,
    },
    {
      title: t('Task'),
      dataIndex: 'title',
      key: 'title',
      render: (_, task) => {
        const title = task.taskTitle || getDisplayName(task, 'Task');
        const pid = typeof task.projectId === 'object' ? task.projectId?._id : task.projectId;
        const href = pid ? `${links.projects}/${pid}` : (links.tasks || links.projects);
        return href ? (
          <a className="dashboard-cell-link" onClick={() => navigate(href)}>{title}</a>
        ) : title;
      },
    },
    {
      title: t('Priority'),
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => <Tag color={priority === 'high' ? 'red' : priority === 'medium' ? 'orange' : 'blue'}>{priority || 'Normal'}</Tag>,
    },
  ];

  const personnelLinkBase = links.users || links.projects || links.shifts;
  const personnelLink = personnelProjectId
    ? `${personnelLinkBase}?projectId=${personnelProjectId}`
    : personnelLinkBase;
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
  const tasksLinkBase = links.tasks || links.projects;
  const tasksLink = deadlineProjectId
    ? `${tasksLinkBase}?projectId=${deadlineProjectId}`
    : tasksLinkBase;

  const stats = [
    {
      label: t('Active projects'),
      value: activeProjects.length,
      trendValue: projectTrendValue,
      trendLabel: t('today'),
      icon: <StatIcon name="briefcase" />,
      color: 'blue',
    },
    {
      label: canSeeCompanyScope ? t('People at work') : t('Active shifts'),
      value: activeShifts.length,
      trendValue: shiftTrendValue,
      trendLabel: t('today'),
      icon: <StatIcon name="users" />,
      color: 'green',
    },
    {
      label: t('Open tasks'),
      value: openTasks.length,
      trendValue: taskTrendValue,
      trendLabel: t('today'),
      icon: <StatIcon name="check-circle" />,
      color: 'orange',
    },
    {
      label: t('Hours of work today'),
      value: formatHours(totalHoursToday),
      trendValue: hoursTrendValue,
      trendLabel: t('h today'),
      trendFormatter: formatTrendHours,
      icon: <StatIcon name="clock" />,
      color: 'purple',
    },
  ];

  const isCompany = section === 'company';

  const statsContent = (
    <Row gutter={[30, 30]} className="dashboard-overview__stats" data-tour="stats">
      {stats.map((stat) => (
        <Col xs={24} md={12} xl={6} key={stat.label}>
          <StatCard {...stat} />
        </Col>
      ))}
    </Row>
  );

  const economyContent = (
    <EconomyBlock
      {...economy}
      invoicesLink="/company/invoicing/invoices"
      costsLink="/company/invoicing/supplier-invoices"
      projectId={economyProjectId}
      onProjectChange={setEconomyProjectId}
    />
  );

  const paymentsContent = (
    <PaymentsDueBlock
      {...economy}
      costsLink="/company/invoicing/supplier-invoices"
      projectId={paymentsProjectId}
      onProjectChange={setPaymentsProjectId}
    />
  );

  const cashflowContent = <CashflowBlock {...economy} calendarLink={links.schedule} />;

  const worktimeContent = <WorkTimeBlock shifts={shifts} users={users} now={today.getTime()} />;

  const personnelContent = (
    <PersonnelOverview
      actionHref={personnelLink}
      columns={personnelColumns}
      rows={personnelRows}
      hasActiveFilter={Boolean(personnelProjectId)}
      filters={(
        <ProjectFilterSelect
          value={personnelProjectId}
          onChange={setPersonnelProjectId}
        />
      )}
    />
  );

  const deadlinesContent = (
    <SectionCard
      actionHref={tasksLink}
      title="Upcoming deadlines"
      filters={(
        <ProjectFilterSelect
          value={deadlineProjectId}
          onChange={setDeadlineProjectId}
        />
      )}
    >
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
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={deadlineProjectId ? t('No upcoming deadlines for this project') : t('No upcoming deadlines')}
        />
      )}
    </SectionCard>
  );

  const projectsContent = (
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
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('No projects found')} />
      )}
    </SectionCard>
  );

  const activityContent = <RecentActivity actionHref={activityLink} items={recentActivity} />;

  // Hide the "Payments due" block entirely when there's nothing unpaid (once the
  // economy data has settled) so it doesn't take a slot just to say "nothing to
  // pay". Omitting the content entry makes BlockGrid skip it — no special-casing
  // needed in the shared grid.
  const hidePaymentsBlock = !economy.loading && !economy.failed && paymentsDueCount === 0;
  const blockContent = {
    stats: statsContent,
    economy: economyContent,
    ...(hidePaymentsBlock ? {} : { payments: paymentsContent }),
    cashflow: cashflowContent,
    worktime: worktimeContent,
    personnel: personnelContent,
    deadlines: deadlinesContent,
    projects: projectsContent,
    activity: activityContent,
  };

  const emptyAlert = !projectsLoading && !projects.length && !tasks.length && !shifts.length ? (
    <Alert
      className="dashboard-overview__empty-alert"
      type="info"
      showIcon
      title={t('No dashboard data yet')}
      description={t('Create projects, tasks, users or shifts to populate this overview.')}
    />
  ) : null;

  // The company dashboard is a flat, drag-reorderable grid of blocks (shared
  // BlockGrid); each block declares a full/half width and can be hidden. Other
  // sections keep the fixed 2x2 layout below.
  const companyGrid = (
    <BlockGrid layout={layout} blockMap={DASHBOARD_BLOCK_MAP} content={blockContent} />
  );

  return (
    <div className="dashboard-overview">
      <div className="dashboard-overview__hero">
        <div>
          <h2>{greeting}{user?.name?.split(' ')?.[0] ? `, ${user.name.split(' ')[0]}` : ''}</h2>
          <p>{t('Here is what is happening across your projects today.')}</p>
        </div>
        <div className="dashboard-overview__hero-actions">
          {isCompany ? (
            <BlockCustomizer
              blocks={DASHBOARD_BLOCKS}
              layout={layout}
              title={t('Customize dashboard')}
            />
          ) : null}
        </div>
      </div>

      {isCompany ? (
        <>
          {canSeeCompanyScope ? (
            <>
              <OnboardingWizard
                companyId={user?.companyId}
                projectCount={projects?.length || 0}
                teamCount={users?.length || 0}
              />
              <OnboardingChecklist
                companyId={user?.companyId}
                projectCount={projects?.length || 0}
                teamCount={users?.length || 0}
              />
            </>
          ) : null}
          {emptyAlert}
          {companyGrid}
        </>
      ) : (
        <>
          {statsContent}
          {emptyAlert}
          <Row gutter={[30, 30]}>
            <Col xs={24} xl={12}>{personnelContent}</Col>
            <Col xs={24} xl={12}>{deadlinesContent}</Col>
            <Col xs={24} xl={12}>{projectsContent}</Col>
            <Col xs={24} xl={12}>{activityContent}</Col>
          </Row>
        </>
      )}
    </div>
  );
}
