import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Empty, Segmented, Spin } from 'antd';
import { LeftOutlined, RightOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { useLocation } from '@/src/shared/routing/routerCompat';
import apiClient from '@/src/api/apiClient';
import Timeline, {
  DateHeader,
  SidebarHeader,
  TimelineHeaders,
  TimelineMarkers,
  TodayMarker,
} from 'react-calendar-timeline';
import ScheduleStats from '@/src/features/schedule/components/ScheduleStats';
import { Select } from '@/src/ui-kit';
import scheduleCalendarIcon from '@/src/assets/icons/schedule-calendar.svg';
import { useAuthStore } from '@/src/store/authStore';
import { useProjectStore } from '@/src/store/projectStore';
import { useShiftStore } from '@/src/store/shiftStore';
import { useTaskStore } from '@/src/store/taskStore';
import { useUserStore } from '@/src/store/userStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatAdminDateRange } from '@/src/utils/formatDateTime';

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

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

const DAY_MS = 24 * 60 * 60 * 1000;
const VISIBLE_DAYS = 16;
const SIDEBAR_WIDTH = 320;
const LINE_HEIGHT = 62;
const MIN_VISIBLE_RANGE_MS = DAY_MS * 3;
const MAX_VISIBLE_RANGE_MS = DAY_MS * 90;
const ZOOM_IN_FACTOR = 0.7;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

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

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const parseMonthKey = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
};

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

const isOpenTask = (task) =>
  !['done', 'completed', 'closed'].includes(String(task?.status || '').toLowerCase());

const getMonthRange = (month) => {
  const start = startOfDay(new Date(month.getFullYear(), month.getMonth(), 1));
  const end = addDays(startOfDay(new Date(month.getFullYear(), month.getMonth() + 1, 0)), 1);

  return {
    start: start.getTime(),
    end: end.getTime(),
  };
};

const overlapsRange = (itemStart, itemEnd, range) =>
  itemStart < range.end && itemEnd > range.start;

const isDateInMonth = (value, month) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
};

const formatHours = (durationMs = 0) => {
  const hours = Math.round((durationMs / 3600000) * 10) / 10;
  return `${hours || 0}h`;
};

const getShiftDateValue = (shift) =>
  shift?.shiftDate || shift?.startedAt || shift?.date || shift?.createdAt;

export default function SchedulePage() {
  const { tasks, loading: tasksLoading, fetchAllAccessible } = useTaskStore();
  const { shifts, loading: shiftsLoading, fetchAllAccessible: fetchShifts } = useShiftStore();
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
  const location = useLocation();

  const [mode, setMode] = useState('employees');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [visibleRange, setVisibleRange] = useState(() => getVisibleRangeForMonth(new Date()));

  const isCompanyArea = location.pathname.startsWith('/company');
  const isLoading = tasksLoading || projectsLoading || usersLoading || shiftsLoading;

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
        fetchShifts().catch(() => null),
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
    fetchShifts,
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
        rangeLabel: formatAdminDateRange(startDate, endDate, ' - ') || '-',
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
        avatarUrl: employee?.avatarUrl,
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

  const monthRange = useMemo(() => getMonthRange(currentMonth), [currentMonth]);

  const scheduleStats = useMemo(() => {
    const activeEmployeeIds = new Set();
    let activeAssignments = 0;
    const activeTaskIds = new Set();

    tasks.forEach((task) => {
      if (!isOpenTask(task)) {
        return;
      }

      const dates = getTaskDates(task);
      const taskId = normalizeId(task);
      const projectId = normalizeId(task.projectId);
      const project = projectMap[projectId];

      if (!dates || !taskId || !project || !overlapsRange(dates.start, dates.end, monthRange)) {
        return;
      }

      activeTaskIds.add(taskId);

      getWorkerIdsForProject(project).forEach((workerId) => {
        activeEmployeeIds.add(workerId);
        activeAssignments += 1;
      });
    });

    const totalDurationMs = shifts.reduce((sum, shift) => {
      if (!isDateInMonth(getShiftDateValue(shift), currentMonth)) {
        return sum;
      }

      return sum + (Number(shift.durationMs) || 0);
    }, 0);

    return {
      activeEmployees: activeEmployeeIds.size,
      activeAssignments,
      activeTasks: activeTaskIds.size,
      totalHours: formatHours(totalDurationMs),
    };
  }, [currentMonth, monthRange, projectMap, shifts, tasks]);

  const monthOptions = useMemo(() => {
    const today = new Date();
    const rangeStart = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), -24);
    const rangeEnd = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), 12);
    const options = [];

    for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor = addMonths(cursor, 1)) {
      options.push({
        value: getMonthKey(cursor),
        label: formatMonthLabel(cursor),
      });
    }

    return options;
  }, []);

  const handleMonthChange = useCallback((monthOffset) => {
    const nextMonth = addMonths(currentMonth, monthOffset);

    setCurrentMonth(nextMonth);
    setVisibleRange(getVisibleRangeForMonth(nextMonth));
  }, [currentMonth]);

  const handleMonthSelect = useCallback((monthKey) => {
    const nextMonth = parseMonthKey(monthKey);

    setCurrentMonth(nextMonth);
    setVisibleRange(getVisibleRangeForMonth(nextMonth));
  }, []);

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

  const handleZoom = useCallback((factor) => {
    setVisibleRange((prev) => {
      const center = (prev.start + prev.end) / 2;
      const currentSpan = prev.end - prev.start;
      const nextSpan = Math.min(
        MAX_VISIBLE_RANGE_MS,
        Math.max(MIN_VISIBLE_RANGE_MS, currentSpan * factor),
      );

      return {
        start: center - (nextSpan / 2),
        end: center + (nextSpan / 2),
      };
    });
  }, []);

  const visibleRangeSpan = visibleRange.end - visibleRange.start;
  const canZoomIn = visibleRangeSpan > MIN_VISIBLE_RANGE_MS;
  const canZoomOut = visibleRangeSpan < MAX_VISIBLE_RANGE_MS;

  const renderItem = ({ item, itemContext, getItemProps }) => {
    const { key, ...itemProps } = getItemProps({
      className: 'schedule-page__task',
      style: {
        backgroundColor: item.color,
        borderColor: item.color,
      },
    });

    return (
      <div key={key} {...itemProps}>
        <div className="schedule-page__task-content" style={{ maxHeight: itemContext.dimensions.height }}>
          <span className="schedule-page__task-title">{item.title}</span>
          <span className="schedule-page__task-subtitle">{item.subtitle}</span>
        </div>
      </div>
    );
  };

  const renderGroup = ({ group }) => (
    <div className={`schedule-page__resource${mode === 'employees' ? ' schedule-page__resource--employee' : ''}`}>
      {mode === 'employees' ? (
        <>
          <Avatar
            size={39}
            src={resolveUrl(group.avatarUrl)}
            className="schedule-page__resource-avatar"
          >
            {group.title.charAt(0).toUpperCase()}
          </Avatar>
          <div className="schedule-page__resource-text">
            <span className="schedule-page__resource-name">{group.title}</span>
            <span className="schedule-page__resource-role">{group.subtitle}</span>
          </div>
        </>
      ) : (
        <>
          <span className="schedule-page__resource-name">{group.title}</span>
          <span className="schedule-page__resource-role">{group.subtitle}</span>
        </>
      )}
    </div>
  );

  return (
    <section className="schedule-page">
      <div className="schedule-page__toolbar">
        <div className="schedule-page__month">
          <button type="button" className="schedule-page__icon-button" onClick={() => handleMonthChange(-1)} aria-label="Previous month">
            <LeftOutlined />
          </button>
          <Select
            className="schedule-page__month-select"
            value={getMonthKey(currentMonth)}
            options={monthOptions}
            onChange={handleMonthSelect}
            popupMatchSelectWidth={false}
            prefix={(
              <img
                src={resolveSvgSrc(scheduleCalendarIcon)}
                width={20}
                height={20}
                alt=""
                aria-hidden="true"
              />
            )}
          />
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

        <div className="schedule-page__zoom">
          <button
            type="button"
            className="schedule-page__icon-button"
            onClick={() => handleZoom(ZOOM_OUT_FACTOR)}
            disabled={!canZoomOut}
            aria-label="Zoom out"
          >
            <ZoomOutOutlined />
          </button>
          <button
            type="button"
            className="schedule-page__icon-button"
            onClick={() => handleZoom(ZOOM_IN_FACTOR)}
            disabled={!canZoomIn}
            aria-label="Zoom in"
          >
            <ZoomInOutlined />
          </button>
        </div>

        <Button className="schedule-page__today" onClick={handleTodayClick}>Today</Button>
      </div>

      <ScheduleStats {...scheduleStats} />

      <div className={`schedule-page__timeline-card${groups.length ? '' : ' schedule-page__timeline-card--empty'}`}>
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
