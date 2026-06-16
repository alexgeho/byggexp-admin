import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, Segmented, Spin } from 'antd';
import { LeftOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import Timeline, {
  DateHeader,
  SidebarHeader,
  TimelineHeaders,
  TimelineMarkers,
  TodayMarker,
} from 'react-calendar-timeline';
import 'react-calendar-timeline/style.css';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { useUserStore } from '../store/userStore';
import { getEntityId } from '../utils/entityId';

const DAY_MS = 24 * 60 * 60 * 1000;
const VISIBLE_DAYS = 16;
const SIDEBAR_WIDTH = 320;
const LINE_HEIGHT = 62;

const EVENT_COLORS = [
  '#0089f6',
  '#11b8cf',
  '#8c00e9',
  '#e56200',
  '#11a979',
  '#f05ba8',
  '#5568ff',
];

const normalizeId = (value) => {
  if (!value) {
    return null;
  }

  return String(typeof value === 'object' ? getEntityId(value) : value);
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

const addMonths = (date, months) => new Date(date.getFullYear(), date.getMonth() + months, 1);

const startOfWeek = (date) => {
  const normalized = startOfDay(date);
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(normalized, diff);
};

const getVisibleRangeForMonth = (date) => {
  const start = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));

  return {
    start: start.getTime(),
    end: addDays(start, VISIBLE_DAYS).getTime(),
  };
};

const formatMonthLabel = (timestamp) =>
  new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(timestamp));

const formatDayLabel = (date) =>
  new Intl.DateTimeFormat('en', { weekday: 'short', day: '2-digit' }).format(date);

const getWeekNumber = (date) => {
  const target = startOfDay(date);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const weekOne = new Date(target.getFullYear(), 0, 4);

  return 1 + Math.round(((target - weekOne) / DAY_MS - 3 + ((weekOne.getDay() + 6) % 7)) / 7);
};

const getProjectDate = (project, primaryKey, fallbackKey) => {
  const primary = project?.[primaryKey];
  const fallback = project?.[fallbackKey];
  const date = new Date(primary || fallback || Date.now());

  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getTaskDates = (task) => {
  const start = new Date(task.startDate);
  const due = new Date(task.dueDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) {
    return null;
  }

  return {
    start: startOfDay(start).getTime(),
    end: addDays(startOfDay(due), 1).getTime(),
  };
};

const getProjectTimelineDates = (project) => {
  const start = new Date(project.beginningDate);
  const end = new Date(project.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return {
    start: startOfDay(start).getTime(),
    end: addDays(startOfDay(end), 1).getTime(),
  };
};

const getWorkerIdsForProject = (project) =>
  (project?.workers || [])
    .map(normalizeId)
    .filter(Boolean);

export default function SchedulePage() {
  const { tasks, loading: tasksLoading, fetchAllAccessible } = useTaskStore();
  const {
    projects,
    loading: projectsLoading,
    fetchAll,
    fetchByCompany: fetchProjectsByCompany,
    fetchMy,
  } = useProjectStore();
  const {
    users,
    loading: usersLoading,
    fetchAll: fetchAllUsers,
    fetchByCompany: fetchUsersByCompany,
  } = useUserStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const [mode, setMode] = useState('employees');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [visibleRange, setVisibleRange] = useState(() => getVisibleRangeForMonth(new Date()));

  const isCompanyArea = location.pathname.startsWith('/company');
  const projectsPath = isCompanyArea ? '/company/projects' : '/admin/projects';
  const isLoading = tasksLoading || projectsLoading || usersLoading;

  useEffect(() => {
    registerAddButton(() => navigate(projectsPath), 'Add project');

    return () => unregisterAddButton();
  }, [navigate, projectsPath, registerAddButton, unregisterAddButton]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadScheduleData = async () => {
      const projectRequest = user.role === 'superadmin'
        ? fetchAll()
        : user.role === 'companyAdmin' && user.companyId
          ? fetchProjectsByCompany(user.companyId)
          : fetchMy();

      const userRequest = user.role === 'superadmin'
        ? fetchAllUsers()
        : user.companyId
          ? fetchUsersByCompany(user.companyId)
          : Promise.resolve([]);

      await Promise.all([
        fetchAllAccessible(),
        projectRequest,
        userRequest,
      ]);
    };

    loadScheduleData().catch((error) => {
      console.error('Failed to load schedule data:', error);
    });
  }, [
    fetchAll,
    fetchAllAccessible,
    fetchAllUsers,
    fetchProjectsByCompany,
    fetchUsersByCompany,
    fetchMy,
    user,
  ]);

  const projectMap = useMemo(() => {
    return projects.reduce((acc, project) => {
      const id = normalizeId(project);
      if (id) {
        acc[id] = project;
      }
      return acc;
    }, {});
  }, [projects]);

  const userMap = useMemo(() => {
    return users.reduce((acc, employee) => {
      const id = normalizeId(employee);
      if (id) {
        acc[id] = employee;
      }
      return acc;
    }, {});
  }, [users]);

  const projectRows = useMemo(() => {
    return projects.map((project) => {
      const id = normalizeId(project);
      const startDate = getProjectDate(project, 'beginningDate', 'createdAt');
      const endDate = getProjectDate(project, 'endDate', 'updatedAt');

      return {
        id,
        title: project.name || 'Untitled project',
        subtitle: project.status || project.location || 'Project',
        rangeLabel: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        height: LINE_HEIGHT,
      };
    }).filter((group) => group.id);
  }, [projects]);

  const employeeRows = useMemo(() => {
    const workerIds = new Set();

    projects.forEach((project) => {
      getWorkerIdsForProject(project).forEach((workerId) => workerIds.add(workerId));
    });

    users
      .filter((employee) => employee.role === 'worker')
      .forEach((employee) => {
        const employeeId = normalizeId(employee);
        if (employeeId) {
          workerIds.add(employeeId);
        }
      });

    return Array.from(workerIds).map((workerId) => {
      const employee = userMap[workerId];

      return {
        id: workerId,
        title: employee?.name || 'Unassigned employee',
        subtitle: employee?.profession || employee?.role || 'Employee',
        height: LINE_HEIGHT,
      };
    });
  }, [projects, userMap, users]);

  const groups = mode === 'employees' ? employeeRows : projectRows;

  const items = useMemo(() => {
    if (mode === 'projects') {
      return projects.flatMap((project, index) => {
        const projectId = normalizeId(project);
        const dates = getProjectTimelineDates(project);

        if (!projectId || !dates) {
          return [];
        }

        const color = EVENT_COLORS[index % EVENT_COLORS.length];

        return [{
          id: `project-${projectId}`,
          group: projectId,
          title: project.name || 'Untitled project',
          subtitle: project.location || project.status || 'Project',
          start_time: dates.start,
          end_time: dates.end,
          canMove: false,
          canResize: false,
          color,
        }];
      });
    }

    return tasks.flatMap((task, index) => {
      const taskId = normalizeId(task);
      const projectId = normalizeId(task.projectId);
      const project = projectMap[projectId];
      const dates = getTaskDates(task);

      if (!taskId || !projectId || !project || !dates) {
        return [];
      }

      const color = EVENT_COLORS[index % EVENT_COLORS.length];
      const baseItem = {
        title: task.taskTitle || 'Untitled task',
        subtitle: project?.name || 'Project',
        start_time: dates.start,
        end_time: dates.end,
        canMove: false,
        canResize: false,
        color,
      };

      const workerIds = getWorkerIdsForProject(project);

      return workerIds.map((workerId) => ({
        ...baseItem,
        id: `${taskId}-${workerId}`,
        group: workerId,
      }));
    });
  }, [mode, projectMap, projects, tasks]);

  const handleMonthChange = useCallback((monthOffset) => {
    const nextMonth = addMonths(currentMonth, monthOffset);

    setCurrentMonth(nextMonth);
    setVisibleRange(getVisibleRangeForMonth(nextMonth));
  }, [currentMonth]);

  const handleTodayClick = () => {
    const today = new Date();
    const month = new Date(today.getFullYear(), today.getMonth(), 1);

    setCurrentMonth(month);
    setVisibleRange(getVisibleRangeForMonth(month));
  };

  const handleTimeChange = (start, end, updateScrollCanvas) => {
    const midpoint = new Date(start + ((end - start) / 2));

    updateScrollCanvas(start, end);
    setCurrentMonth(new Date(midpoint.getFullYear(), midpoint.getMonth(), 1));
    setVisibleRange({ start, end });
  };

  const renderItem = ({ item, itemContext, getItemProps }) => {
    const props = getItemProps({
      className: 'schedule-page__task',
      style: {
        backgroundColor: item.color,
        borderColor: item.color,
      },
    });

    return (
      <div {...props}>
        <div className="schedule-page__task-content" style={{ maxHeight: itemContext.dimensions.height }}>
          <span className="schedule-page__task-title">{item.title}</span>
          <span className="schedule-page__task-subtitle">{item.subtitle}</span>
        </div>
      </div>
    );
  };

  const renderGroup = ({ group }) => (
    <div className="schedule-page__resource">
      <span className="schedule-page__resource-name">{group.title}</span>
      <span className="schedule-page__resource-role">{group.subtitle}</span>
    </div>
  );

  return (
    <section className="schedule-page">
      <div className="schedule-page__toolbar">
        <div className="schedule-page__month">
          <button type="button" className="schedule-page__icon-button" aria-label="Search schedule">
            <SearchOutlined />
          </button>
          <button type="button" className="schedule-page__icon-button" onClick={() => handleMonthChange(-1)} aria-label="Previous month">
            <LeftOutlined />
          </button>
          <span className="schedule-page__month-label">{formatMonthLabel(currentMonth)}</span>
          <button type="button" className="schedule-page__icon-button" onClick={() => handleMonthChange(1)} aria-label="Next month">
            <RightOutlined />
          </button>
        </div>

        <Segmented
          className="schedule-page__switch"
          value={mode}
          onChange={setMode}
          options={[
            { label: 'Employees', value: 'employees' },
            { label: 'Projects', value: 'projects' },
          ]}
        />

        <Button className="schedule-page__today" onClick={handleTodayClick}>Today</Button>
      </div>

      <div className="schedule-page__timeline-card">
        <Spin spinning={isLoading}>
          {groups.length ? (
            <Timeline
              groups={groups}
              items={items}
              visibleTimeStart={visibleRange.start}
              visibleTimeEnd={visibleRange.end}
              sidebarWidth={SIDEBAR_WIDTH}
              lineHeight={LINE_HEIGHT}
              itemHeightRatio={0.52}
              stackItems
              canMove={false}
              canResize={false}
              canChangeGroup={false}
              timeSteps={{ second: 1, minute: 1, hour: 1, day: 1, month: 1, year: 1 }}
              onTimeChange={handleTimeChange}
              groupRenderer={renderGroup}
              itemRenderer={renderItem}
            >
              <TimelineHeaders>
                <SidebarHeader>
                  {({ getRootProps }) => (
                    <div {...getRootProps({ className: 'schedule-page__sidebar-header' })}>
                      <span>{mode === 'employees' ? `Employees (${groups.length})` : `Projects (${groups.length})`}</span>
                    </div>
                  )}
                </SidebarHeader>
                <DateHeader
                  unit="week"
                  height={34}
                  labelFormat={([startTime]) => `Week ${getWeekNumber(new Date(startTime.valueOf()))}`}
                />
                <DateHeader
                  unit="day"
                  height={38}
                  labelFormat={([startTime]) => formatDayLabel(new Date(startTime.valueOf()))}
                />
              </TimelineHeaders>
              <TimelineMarkers>
                <TodayMarker>
                  {({ styles }) => (
                    <div
                      className="schedule-page__today-marker"
                      style={styles}
                    />
                  )}
                </TodayMarker>
              </TimelineMarkers>
            </Timeline>
          ) : (
            <Empty description="No schedule data yet" />
          )}
        </Spin>
      </div>
    </section>
  );
}
