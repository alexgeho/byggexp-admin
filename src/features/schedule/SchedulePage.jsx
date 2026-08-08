import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, DatePicker, Dropdown, Empty, Modal, Spin, Tabs } from 'antd';
import GridWorkspaceHeader from '@/src/shared/components/GridWorkspaceHeader';
import AssignmentChangesLog from '@/src/features/schedule/components/AssignmentChangesLog';
import { useT } from '@/src/i18n/LanguageProvider';
import dayjs from 'dayjs';
import { DownOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useAssignmentStore } from '@/src/store/assignmentStore';
import Timeline, {
  DateHeader,
  SidebarHeader,
  TimelineHeaders,
  TimelineMarkers,
  TodayMarker,
} from 'react-calendar-timeline';
import { IconButton, PeriodNav, Segmented, Select } from '@/src/ui-kit';
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

// All day keys (YYYY-MM-DD) in an inclusive range.
const enumerateDays = (fromKey, toKey) => {
  const out = [];
  let cursor = dayjs(fromKey);
  const end = dayjs(toKey);
  while (cursor.isSame(end, 'day') || cursor.isBefore(end, 'day')) {
    out.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }
  return out;
};

// Edit an existing assignment bar: change project, shift/resize its dates, or
// remove it. Persisted as day-rows by the parent (delete + recreate the range).
function AssignmentEditModal({ bar, projects, onCancel, onSave, onDelete }) {
  const [projectId, setProjectId] = useState(null);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);

  useEffect(() => {
    if (bar) {
      setProjectId(bar.projectId);
      setFrom(dayjs(bar.dates[0]));
      setTo(dayjs(bar.dates[bar.dates.length - 1]));
    }
  }, [bar]);

  const projectOptions = (projects || []).map((p) => ({ value: String(p._id || p.id), label: p.name || 'Project' }));
  const invalid = !projectId || !from || !to || to.isBefore(from, 'day');

  return (
    <Modal
      open={Boolean(bar)}
      title="Edit assignment"
      onCancel={onCancel}
      footer={[
        <Button key="del" danger onClick={onDelete}>Delete</Button>,
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button key="save" type="primary" disabled={invalid} onClick={() => onSave({ projectId, from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') })}>Save</Button>,
      ]}
    >
      <div className="schedule-assign-modal">
        <p className="schedule-assign-modal__row">Employee: <b>{bar?.workerName}</b></p>
        <label className="schedule-assign-modal__field">
          <span>Project</span>
          <Select value={projectId} onChange={setProjectId} options={projectOptions} showSearch optionFilterProp="label" style={{ width: '100%' }} />
        </label>
        <div className="schedule-assign-modal__dates">
          <label className="schedule-assign-modal__field">
            <span>From</span>
            <DatePicker value={from} onChange={setFrom} allowClear={false} style={{ width: '100%' }} />
          </label>
          <label className="schedule-assign-modal__field">
            <span>To</span>
            <DatePicker value={to} onChange={setTo} allowClear={false} style={{ width: '100%' }} />
          </label>
        </div>
      </div>
    </Modal>
  );
}

// Create a new assignment: pick a worker, a project and a date range.
function AssignmentCreateModal({ open, employees, projects, onCancel, onCreate }) {
  const [workerId, setWorkerId] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [from, setFrom] = useState(() => dayjs());
  const [to, setTo] = useState(() => dayjs());

  useEffect(() => {
    if (open) {
      setWorkerId(null);
      setProjectId(null);
      setFrom(dayjs());
      setTo(dayjs());
    }
  }, [open]);

  const projectOptions = (projects || []).map((p) => ({ value: String(p._id || p.id), label: p.name || 'Project' }));
  const invalid = !workerId || !projectId || !from || !to || to.isBefore(from, 'day');

  return (
    <Modal
      open={open}
      title="Assign to project"
      onCancel={onCancel}
      okText="Assign"
      okButtonProps={{ disabled: invalid }}
      onOk={() => onCreate({ workerId, projectId, from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') })}
    >
      <div className="schedule-assign-modal">
        <label className="schedule-assign-modal__field">
          <span>Employee</span>
          <Select value={workerId} onChange={setWorkerId} options={employees} showSearch optionFilterProp="label" placeholder="Select employee" style={{ width: '100%' }} />
        </label>
        <label className="schedule-assign-modal__field">
          <span>Project</span>
          <Select value={projectId} onChange={setProjectId} options={projectOptions} showSearch optionFilterProp="label" placeholder="Select project" style={{ width: '100%' }} />
        </label>
        <div className="schedule-assign-modal__dates">
          <label className="schedule-assign-modal__field">
            <span>From</span>
            <DatePicker value={from} onChange={setFrom} allowClear={false} style={{ width: '100%' }} />
          </label>
          <label className="schedule-assign-modal__field">
            <span>To</span>
            <DatePicker value={to} onChange={setTo} allowClear={false} style={{ width: '100%' }} />
          </label>
        </div>
      </div>
    </Modal>
  );
}

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

  const [mode, setMode] = useState('employees');
  // Period model mirrors Shifts: 2 weeks / Month / Custom, navigated by offset.
  const [periodMode, setPeriodMode] = useState('month'); // '2w' | 'month' | 'custom'
  const [periodOffset, setPeriodOffset] = useState(0);
  const [customRange, setCustomRange] = useState(() => ({
    from: dayjs().startOf('month'),
    to: dayjs().endOf('month'),
  }));
  const [visibleRange, setVisibleRange] = useState(() => ({
    start: dayjs().startOf('month').valueOf(),
    end: dayjs().endOf('month').valueOf(),
  }));

  const periodRange = useMemo(() => {
    if (periodMode === 'custom') {
      return { from: customRange.from.startOf('day'), to: customRange.to.endOf('day') };
    }
    if (periodMode === '2w') {
      const from = dayjs().startOf('isoWeek').add(periodOffset * 2, 'week');
      return { from, to: from.add(13, 'day').endOf('day') };
    }
    const anchor = dayjs().add(periodOffset, 'month');
    return { from: anchor.startOf('month'), to: anchor.endOf('month') };
  }, [periodMode, periodOffset, customRange]);

  const periodLabel = useMemo(
    () => `${periodRange.from.format('D MMM')} – ${periodRange.to.format('D MMM YYYY')}`,
    [periodRange],
  );

  const {
    assignments,
    fetchRange: fetchAssignments,
    create: createAssignment,
    remove: removeAssignment,
  } = useAssignmentStore();
  const [editBar, setEditBar] = useState(null);
  const t = useT();
  const [assignOpen, setAssignOpen] = useState(false);
  const [scheduleTab, setScheduleTab] = useState('planering');

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

  const refetchAssignments = useCallback(() => {
    fetchAssignments(periodRange.from.format('YYYY-MM-DD'), periodRange.to.format('YYYY-MM-DD'));
  }, [periodRange, fetchAssignments]);

  useEffect(() => {
    refetchAssignments();
  }, [refetchAssignments]);

  // Reset the timeline viewport to the selected period (zoom then adjusts it).
  useEffect(() => {
    setVisibleRange({ start: periodRange.from.valueOf(), end: periodRange.to.valueOf() });
  }, [periodRange]);

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

    return Array.from(workerIds)
      // Hide GDPR-erased (anonymised) accounts — they linger on projects but
      // shouldn't appear as schedulable people.
      .filter((workerId) => {
        const employee = userMap[workerId];
        return !employee?.erasedAt && employee?.name !== 'Raderad användare';
      })
      .map((workerId) => {
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

  const projectColorMap = useMemo(() => {
    const m = new Map();
    projects.forEach((p, i) => {
      const id = normalizeId(p);
      if (id) m.set(id, EVENT_COLORS[i % EVENT_COLORS.length]);
    });
    return m;
  }, [projects]);

  // Group per-day assignments into contiguous per-worker+project bars.
  const assignmentBars = useMemo(() => {
    const byKey = new Map();
    assignments.forEach((a) => {
      const workerId = normalizeId(a.userId);
      const projectId = normalizeId(a.projectId);
      if (!workerId || !projectId || !a.date) return;
      const key = `${workerId}__${projectId}`;
      if (!byKey.has(key)) byKey.set(key, { workerId, projectId, days: [] });
      byKey.get(key).days.push({ day: dayjs(a.date).format('YYYY-MM-DD'), id: a._id || a.id });
    });

    const bars = [];
    byKey.forEach(({ workerId, projectId, days }) => {
      days.sort((x, y) => x.day.localeCompare(y.day));
      let run = [];
      const flush = () => {
        if (!run.length) return;
        const first = run[0].day;
        const last = run[run.length - 1].day;
        bars.push({
          id: `asg-${workerId}-${projectId}-${first}`,
          group: workerId,
          title: projectMap[projectId]?.name || 'Project',
          subtitle: '',
          start_time: dayjs(first).startOf('day').valueOf(),
          end_time: dayjs(last).add(1, 'day').startOf('day').valueOf(),
          canMove: false,
          canResize: false,
          color: projectColorMap.get(projectId) || EVENT_COLORS[0],
          meta: { workerId, projectId, dates: run.map((r) => r.day), ids: run.map((r) => r.id) },
        });
        run = [];
      };
      days.forEach((d, i) => {
        if (i === 0) { run = [d]; return; }
        if (dayjs(d.day).diff(dayjs(days[i - 1].day), 'day') === 1) run.push(d);
        else { flush(); run = [d]; }
      });
      flush();
    });
    return bars;
  }, [assignments, projectMap, projectColorMap]);

  const barsById = useMemo(() => {
    const m = new Map();
    assignmentBars.forEach((b) => m.set(b.id, b));
    return m;
  }, [assignmentBars]);

  const workerOptions = useMemo(
    () => employeeRows.map((r) => ({ value: r.id, label: r.title })),
    [employeeRows],
  );

  const handleItemClick = useCallback((itemId) => {
    if (mode !== 'employees') return;
    const bar = barsById.get(itemId);
    if (!bar) return;
    setEditBar({ ...bar.meta, workerName: userMap[bar.meta.workerId]?.name || 'Employee' });
  }, [mode, barsById, userMap]);

  const handleSaveBar = useCallback(async ({ projectId, from, to }) => {
    if (!editBar) return;
    const days = enumerateDays(from, to);
    await Promise.all(editBar.ids.map((id) => removeAssignment(id).catch(() => null)));
    await Promise.all(days.map((date) => createAssignment({ userId: editBar.workerId, projectId, date }).catch(() => null)));
    setEditBar(null);
    refetchAssignments();
  }, [editBar, removeAssignment, createAssignment, refetchAssignments]);

  const handleDeleteBar = useCallback(async () => {
    if (!editBar) return;
    await Promise.all(editBar.ids.map((id) => removeAssignment(id).catch(() => null)));
    setEditBar(null);
    refetchAssignments();
  }, [editBar, removeAssignment, refetchAssignments]);

  const handleCreateAssign = useCallback(async ({ workerId, projectId, from, to }) => {
    const days = enumerateDays(from, to);
    await Promise.all(days.map((date) => createAssignment({ userId: workerId, projectId, date }).catch(() => null)));
    setAssignOpen(false);
    refetchAssignments();
  }, [createAssignment, refetchAssignments]);

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

    // Employees mode shows real, editable staffing assignments.
    return assignmentBars;
  }, [mode, projects, assignmentBars]);

  const handleStep = useCallback((delta) => {
    setPeriodOffset((o) => o + delta);
  }, []);

  const handleTodayClick = useCallback(() => {
    setPeriodOffset(0);
    if (periodMode === 'custom') setPeriodMode('month');
  }, [periodMode]);

  const handleTimeChange = (start, end, updateScrollCanvas) => {
    updateScrollCanvas(start, end);
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
      <GridWorkspaceHeader
        tabs={(
          <Tabs
            activeKey={scheduleTab}
            onChange={setScheduleTab}
            items={[
              { key: 'planering', label: t('Schedule') },
              { key: 'changes', label: t('Changes log') },
            ]}
          />
        )}
        toggleRow={scheduleTab === 'planering' ? (
          <>
            <span className="grid-workspace-header__label">{t('Plan for')}</span>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { label: t('Personnel'), value: 'employees' },
                { label: t('Projects'), value: 'projects' },
              ]}
            />
          </>
        ) : null}
        periodRow={scheduleTab === 'planering' ? (
          <>
            <Segmented
              value={periodMode}
              onChange={setPeriodMode}
              options={[
                { value: '2w', label: t('2 weeks') },
                { value: 'month', label: t('Month') },
                { value: 'custom', label: t('Custom') },
              ]}
            />

            {periodMode === 'custom' ? (
              <div className="gwh-datefield">
                <span className="gwh-date" role="button" tabIndex={0} onClick={(e) => e.currentTarget.querySelector('input')?.showPicker?.()}>
                  <span className="fl">{t('From')}</span>
                  <input type="date" value={customRange.from.format('YYYY-MM-DD')} onChange={(e) => setCustomRange((c) => ({ ...c, from: dayjs(e.target.value) }))} />
                </span>
                <span className="gwh-date" role="button" tabIndex={0} onClick={(e) => e.currentTarget.querySelector('input')?.showPicker?.()}>
                  <span className="fl">{t('To')}</span>
                  <input type="date" value={customRange.to.format('YYYY-MM-DD')} onChange={(e) => setCustomRange((c) => ({ ...c, to: dayjs(e.target.value) }))} />
                </span>
              </div>
            ) : (
              <PeriodNav
                onPrev={() => handleStep(-1)}
                onNext={() => handleStep(1)}
                onToday={periodOffset !== 0 ? handleTodayClick : undefined}
                prevLabel={t('Previous period')}
                nextLabel={t('Next period')}
                todayLabel={t('Today')}
              >
                {periodLabel}
              </PeriodNav>
            )}

            <div className="schedule-page__zoom">
              <IconButton onClick={() => handleZoom(ZOOM_OUT_FACTOR)} disabled={!canZoomOut} aria-label={t('Zoom out')}>
                <ZoomOutOutlined />
              </IconButton>
              <IconButton onClick={() => handleZoom(ZOOM_IN_FACTOR)} disabled={!canZoomIn} aria-label={t('Zoom in')}>
                <ZoomInOutlined />
              </IconButton>
            </div>

            <span className="grid-workspace-header__spacer" />

            {mode === 'employees' ? (
              <Button type="primary" className="schedule-page__assign" onClick={() => setAssignOpen(true)}>+ Assign</Button>
            ) : null}
          </>
        ) : null}
      />

      {scheduleTab === 'changes' ? (
        <AssignmentChangesLog />
      ) : (
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
              onItemSelect={handleItemClick}
              onItemClick={handleItemClick}
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
      )}

      <AssignmentEditModal
        bar={editBar}
        projects={projects}
        onCancel={() => setEditBar(null)}
        onSave={handleSaveBar}
        onDelete={handleDeleteBar}
      />
      <AssignmentCreateModal
        open={assignOpen}
        employees={workerOptions}
        projects={projects}
        onCancel={() => setAssignOpen(false)}
        onCreate={handleCreateAssign}
      />
    </section>
  );
}
