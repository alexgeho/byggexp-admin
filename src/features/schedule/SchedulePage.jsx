import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Empty, Spin, Tabs } from 'antd';
import GridWorkspaceHeader from '@/src/shared/components/GridWorkspaceHeader';
import AssignmentChangesLog from '@/src/features/schedule/components/AssignmentChangesLog';
import AssignmentEditModal from '@/src/features/schedule/components/AssignmentEditModal';
import AssignmentCreateModal from '@/src/features/schedule/components/AssignmentCreateModal';
import { useT } from '@/src/i18n/LanguageProvider';
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
                { label: t('Staff'), value: 'employees' },
                { label: t('Projects'), value: 'projects' },
              ]}
            />
            {mode === 'employees' ? (
              <Button type="primary" className="schedule-page__assign" onClick={() => setAssignOpen(true)}>+ Assign</Button>
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
