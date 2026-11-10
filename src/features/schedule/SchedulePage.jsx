import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Button, Empty, Spin, Tabs } from 'antd';
import GridWorkspaceHeader from '@/src/shared/components/GridWorkspaceHeader';
import AssignmentChangesLog from '@/src/features/schedule/components/AssignmentChangesLog';
import AssignmentEditModal from '@/src/features/schedule/components/AssignmentEditModal';
import AssignmentCreateModal from '@/src/features/schedule/components/AssignmentCreateModal';
import TeamAssignModal from '@/src/features/schedule/components/TeamAssignModal';
import TeamManagerModal from '@/src/features/schedule/components/TeamManagerModal';
import apiClient from '@/src/api/apiClient';
import { useT, useLanguage } from '@/src/i18n/LanguageProvider';
import dayjs from 'dayjs';
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { useAssignmentStore } from '@/src/store/assignmentStore';
import Timeline, {
  DateHeader,
  SidebarHeader,
  TimelineHeaders,
  TimelineMarkers,
  TodayMarker,
} from 'react-calendar-timeline';
import { IconButton, PeriodNav, Segmented } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useProjectStore } from '@/src/store/projectStore';
import { useShiftStore } from '@/src/store/shiftStore';
import { useTaskStore } from '@/src/store/taskStore';
import { useUserStore } from '@/src/store/userStore';
import { formatAdminDateRange } from '@/src/utils/formatDateTime';
import {
  SIDEBAR_WIDTH, LINE_HEIGHT, MIN_VISIBLE_RANGE_MS, MAX_VISIBLE_RANGE_MS,
  ZOOM_IN_FACTOR, ZOOM_OUT_FACTOR, EVENT_COLORS, resolveUrl, enumerateDays,
  normalizeId, formatDayLabel, getWeekNumber, getProjectDate,
  getProjectTimelineDates, getWorkerIdsForProject,
} from '@/src/features/schedule/scheduleUtils';

export default function SchedulePage() {
  const { loading: tasksLoading, fetchAllAccessible } = useTaskStore();
  const { loading: shiftsLoading, fetchAllAccessible: fetchShifts } = useShiftStore();
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

  const { lang } = useLanguage();
  const periodLabel = useMemo(() => {
    const short = { day: 'numeric', month: 'short' };
    const from = periodRange.from.toDate().toLocaleDateString(lang, short);
    const to = periodRange.to.toDate().toLocaleDateString(lang, { ...short, year: 'numeric' });
    return `${from} – ${to}`;
  }, [periodRange, lang]);

  const {
    assignments,
    fetchRange: fetchAssignments,
    create: createAssignment,
    remove: removeAssignment,
  } = useAssignmentStore();
  const [editBar, setEditBar] = useState(null);
  const t = useT();
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignInit, setAssignInit] = useState(null); // { workerId, date } from a clicked empty day
  const [absences, setAbsences] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamAssignOpen, setTeamAssignOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
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

  // Approved leave (Frånvaro) is shown on the staff rows; those days can't be assigned.
  useEffect(() => {
    apiClient.get('/leave', { params: { status: 'approved' } })
      .then((r) => setAbsences(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAbsences([]));
  }, [periodRange]);

  const loadTeams = useCallback(() => apiClient.get('/teams')
    .then((r) => setTeams(Array.isArray(r.data) ? r.data : []))
    .catch(() => setTeams([])), []);
  useEffect(() => { loadTeams(); }, [loadTeams]);

  // Reset the timeline viewport to the selected period (zoom then adjusts it).
  useEffect(() => {
    setVisibleRange({ start: periodRange.from.valueOf(), end: periodRange.to.valueOf() });
  }, [periodRange]);

  // react-calendar-timeline measures its width from the container and only
  // re-measures on a window resize. Collapsing the sidebar widens the container
  // WITHOUT a window resize, leaving a white gap on the right — so watch our own
  // width and nudge the timeline to recompute when it changes.
  const rootRef = useRef(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let raf = 0;
    let last = el.offsetWidth;
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth === last) return;
      last = el.offsetWidth;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    });
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);

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

  // Personal mode: every person gets their own cool colour so rows read apart.
  const workerColorMap = useMemo(() => {
    const m = new Map();
    employeeRows.forEach((row, i) => m.set(String(row.id), EVENT_COLORS[i % EVENT_COLORS.length]));
    return m;
  }, [employeeRows]);

  const dayKey = (v) => (typeof v === 'string' ? v.slice(0, 10) : dayjs(v).format('YYYY-MM-DD'));

  // worker|day → total planned hours (for the overbooked flag) and which cells are taken.
  const hoursByCell = useMemo(() => {
    const m = new Map();
    assignments.forEach((a) => {
      const k = `${normalizeId(a.userId)}|${dayKey(a.date)}`;
      m.set(k, (m.get(k) || 0) + (Number(a.hours) || 8));
    });
    return m;
  }, [assignments]);

  const absentCells = useMemo(() => {
    const set = new Set();
    absences.forEach((leave) => {
      const uid = normalizeId(leave.userId);
      if (!uid || !leave.startDate) return;
      enumerateDays(dayKey(leave.startDate), dayKey(leave.endDate || leave.startDate))
        .slice(0, 366)
        .forEach((d) => set.add(`${uid}|${d}`));
    });
    return set;
  }, [absences]);

  // Group per-day assignments into contiguous per-worker+project bars.
  const assignmentBars = useMemo(() => {
    const byKey = new Map();
    assignments.forEach((a) => {
      const workerId = normalizeId(a.userId);
      const projectId = normalizeId(a.projectId);
      if (!workerId || !projectId || !a.date) return;
      const key = `${workerId}__${projectId}`;
      if (!byKey.has(key)) byKey.set(key, { workerId, projectId, days: [] });
      // Take the YYYY-MM-DD prefix straight off the stored value (UTC midnight),
      // not dayjs(...) which reparses in the browser's local zone and drifts a day.
      const day = typeof a.date === 'string' ? a.date.slice(0, 10) : dayjs(a.date).format('YYYY-MM-DD');
      byKey.get(key).days.push({ day, id: a._id || a.id, hours: Number(a.hours) || 8 });
    });

    const bars = [];
    byKey.forEach(({ workerId, projectId, days }) => {
      days.sort((x, y) => x.day.localeCompare(y.day));
      let run = [];
      const flush = () => {
        if (!run.length) return;
        const first = run[0].day;
        const last = run[run.length - 1].day;
        const hrs = [...new Set(run.map((r) => r.hours))];
        const overbooked = run.some((r) => (hoursByCell.get(`${workerId}|${r.day}`) || 0) > 8);
        bars.push({
          id: `asg-${workerId}-${projectId}-${first}`,
          group: workerId,
          title: projectMap[projectId]?.name || 'Project',
          subtitle: hrs.length === 1 ? `${hrs[0]} h` : `${Math.min(...hrs)}–${Math.max(...hrs)} h`,
          overbooked,
          start_time: dayjs(first).startOf('day').valueOf(),
          end_time: dayjs(last).add(1, 'day').startOf('day').valueOf(),
          canMove: false,
          canResize: false,
          color: workerColorMap.get(String(workerId)) || projectColorMap.get(projectId) || EVENT_COLORS[0],
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
  }, [assignments, projectMap, projectColorMap, workerColorMap, hoursByCell]);

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
    if (String(itemId).startsWith('ph|')) {
      const [, workerId, date] = String(itemId).split('|');
      setAssignInit({ workerId, date });
      setAssignOpen(true);
      return;
    }
    const bar = barsById.get(itemId);
    if (!bar) return;
    setEditBar({ ...bar.meta, workerName: userMap[bar.meta.workerId]?.name || 'Employee' });
  }, [mode, barsById, userMap]);

  const handleSaveBar = useCallback(async ({ projectId, from, to }) => {
    if (!editBar) return;
    // Set-reconciliation (diff) instead of delete-all-then-recreate: create only
    // the days that were added, delete only the days that were removed, and leave
    // the overlap untouched. This never re-creates an existing (worker,project,
    // date) — so the unique constraint can't 409 — and a partial failure can't
    // wipe the whole bar (each single-doc write is independently retry-safe).
    const newDays = enumerateDays(from, to);
    const sameProject = String(projectId) === String(editBar.projectId);
    const oldIdByDay = new Map((editBar.dates || []).map((d, i) => [d, editBar.ids[i]]));
    const newSet = new Set(newDays);
    // When the project changes there is no overlap to preserve (the old rows
    // belong to the old project), so replace them all.
    const toCreate = sameProject ? newDays.filter((d) => !oldIdByDay.has(d)) : newDays;
    const toDelete = sameProject
      ? (editBar.dates || []).filter((d) => !newSet.has(d)).map((d) => oldIdByDay.get(d))
      : editBar.ids;
    await Promise.all([
      ...toCreate.map((date) => createAssignment({ userId: editBar.workerId, projectId, date }).catch(() => null)),
      ...toDelete.map((id) => removeAssignment(id).catch(() => null)),
    ]);
    setEditBar(null);
    refetchAssignments();
  }, [editBar, removeAssignment, createAssignment, refetchAssignments]);

  const handleDeleteBar = useCallback(async () => {
    if (!editBar) return;
    await Promise.all(editBar.ids.map((id) => removeAssignment(id).catch(() => null)));
    setEditBar(null);
    refetchAssignments();
  }, [editBar, removeAssignment, refetchAssignments]);

  const handleCreateAssign = useCallback(async ({ workerIds, projectId, from, to, hours }) => {
    const days = enumerateDays(from, to);
    await Promise.all(workerIds.flatMap((userId) => days.map((date) => (
      createAssignment({ userId, projectId, date, hours }).catch(() => null)
    ))));
    setAssignOpen(false);
    setAssignInit(null);
    refetchAssignments();
  }, [createAssignment, refetchAssignments]);

  const handleTeamAssign = useCallback(async ({ memberIds, projectId, from, to, hours }) => {
    const days = enumerateDays(from, to);
    await Promise.all(memberIds.flatMap((userId) => days.map((date) => (
      createAssignment({ userId, projectId, date, hours }).catch(() => null)
    ))));
    setTeamAssignOpen(false);
    refetchAssignments();
  }, [createAssignment, refetchAssignments]);

  const teamWorkers = useMemo(() => users.filter((u) => u.role === 'worker'), [users]);

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

    // Employees mode: real assignments + Frånvaro + a "+ Tilldela" placeholder on
    // every free day, so it's obvious an empty day can be clicked.
    const extra = [];
    const periodDays = enumerateDays(periodRange.from.format('YYYY-MM-DD'), periodRange.to.format('YYYY-MM-DD'));
    employeeRows.forEach((row) => {
      periodDays.forEach((d) => {
        const k = `${row.id}|${d}`;
        const start = dayjs(d).startOf('day').valueOf();
        const end = dayjs(d).add(1, 'day').startOf('day').valueOf();
        if (absentCells.has(k)) {
          extra.push({ id: `abs|${k}`, kind: 'absence', group: row.id, title: t('Absent'), start_time: start, end_time: end, canMove: false, canResize: false });
        } else if (!hoursByCell.has(k)) {
          extra.push({ id: `ph|${k}`, kind: 'placeholder', group: row.id, title: '', start_time: start, end_time: end, canMove: false, canResize: false, meta: { workerId: row.id, date: d } });
        }
      });
    });
    return [...assignmentBars, ...extra];
  }, [mode, projects, assignmentBars, employeeRows, periodRange, absentCells, hoursByCell, t]);

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
    if (item.kind === 'placeholder' || item.kind === 'absence') {
      const { key, ...props } = getItemProps({
        className: `schedule-page__slot schedule-page__slot--${item.kind}`,
        style: { background: 'transparent', border: 'none', boxShadow: 'none' },
      });
      const label = item.kind === 'absence'
        ? item.title
        : itemContext.dimensions.width >= 84 ? `+ ${t('Assign')}` : '+';
      return (
        <div key={key} {...props}>
          <span className="schedule-page__slot-box">{label}</span>
        </div>
      );
    }
    const { key, ...itemProps } = getItemProps({
      className: `schedule-page__task${item.overbooked ? ' schedule-page__task--over' : ''}`,
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
    <section className="schedule-page" ref={rootRef}>
      <GridWorkspaceHeader
        className="schedule-page__header"
        reserveRows
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
                { label: t('Projects'), value: 'projects' },
                { label: t('Staff'), value: 'employees' },
              ]}
            />
            {mode === 'employees' ? (
              <>
                <Button type="primary" className="schedule-page__assign" onClick={() => { setAssignInit(null); setAssignOpen(true); }}>+ {t('Assign')}</Button>
                <Button onClick={() => setTeamAssignOpen(true)} disabled={!teams.length}>{t('Assign team')}</Button>
                <Button onClick={() => setTeamsOpen(true)}>{t('Teams')}</Button>
              </>
            ) : null}
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
                      <span>{`${mode === 'employees' ? t('Staff') : t('Projects')} (${groups.length})`}</span>
                    </div>
                  )}
                </SidebarHeader>
                <DateHeader
                  unit="week"
                  height={34}
                  labelFormat={([startTime]) => `${t('Week')} ${getWeekNumber(new Date(startTime.valueOf()))}`}
                />
                <DateHeader
                  unit="day"
                  height={38}
                  intervalRenderer={({ getIntervalProps, intervalContext }) => {
                    // Adapt the day label to the column width so labels don't
                    // collide when zoomed out: wide → "Mon 20", narrow → "20",
                    // very narrow → blank (the Week band still gives context).
                    const w = intervalContext.interval.labelWidth;
                    const d = new Date(intervalContext.interval.startTime.valueOf());
                    // Fallback: if the width is unknown, show the full label rather
                    // than blanking it.
                    const text = !(w > 0) || w >= 40 ? formatDayLabel(d) : w >= 14 ? String(d.getDate()) : '';
                    return (
                      <div {...getIntervalProps({ style: { cursor: 'default' } })} className="rct-dateHeader schedule-day-h">
                        <span>{text}</span>
                      </div>
                    );
                  }}
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
            <Empty description={t('No schedule data yet')} />
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
      <TeamAssignModal
        open={teamAssignOpen}
        teams={teams}
        projects={projects}
        onCancel={() => setTeamAssignOpen(false)}
        onCreate={handleTeamAssign}
      />
      <TeamManagerModal
        open={teamsOpen}
        onClose={() => setTeamsOpen(false)}
        teams={teams}
        workers={teamWorkers}
        onChanged={loadTeams}
      />
      <AssignmentCreateModal
        open={assignOpen}
        initial={assignInit}
        employees={workerOptions}
        projects={projects}
        onCancel={() => { setAssignOpen(false); setAssignInit(null); }}
        onCreate={handleCreateAssign}
      />
    </section>
  );
}
