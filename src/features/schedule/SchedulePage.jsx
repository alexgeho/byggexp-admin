import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Spin, Tabs } from 'antd';
import GridWorkspaceHeader from '@/src/shared/components/GridWorkspaceHeader';
import AssignmentChangesLog from '@/src/features/schedule/components/AssignmentChangesLog';
import AssignmentEditModal from '@/src/features/schedule/components/AssignmentEditModal';
import AssignmentCreateModal from '@/src/features/schedule/components/AssignmentCreateModal';
import TeamAssignModal from '@/src/features/schedule/components/TeamAssignModal';
import TeamManagerModal from '@/src/features/schedule/components/TeamManagerModal';
import ScheduleCalendar from '@/src/features/schedule/components/ScheduleCalendar';
import OrderQuickModal from '@/src/features/schedule/components/OrderQuickModal';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { useT, useLanguage } from '@/src/i18n/LanguageProvider';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);
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
  ZOOM_IN_FACTOR, ZOOM_OUT_FACTOR, EVENT_COLORS, enumerateDays,
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
  const [periodMode, setPeriodMode] = useState('2w'); // '1w' | '2w' | 'month' | 'custom' — always opens on 2 weeks (owner, 12.11)
  // Open on the view the user picked last time (per browser).
  const [viewPrefReady, setViewPrefReady] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('planering-view') || '{}');
      if (['employees', 'projects'].includes(saved.mode)) setMode(saved.mode);
    } catch { /* storage blocked — keep defaults */ }
    setViewPrefReady(true); // batched with the restored values above
  }, []);
  useEffect(() => {
    if (!viewPrefReady) return;
    try { window.localStorage.setItem('planering-view', JSON.stringify({ periodMode, mode })); } catch { /* ignore */ }
  }, [periodMode, mode, viewPrefReady]);
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
    if (periodMode === '1w') {
      const from = dayjs().startOf('isoWeek').add(periodOffset, 'week');
      return { from, to: from.add(6, 'day').endOf('day') };
    }
    if (periodMode === '2w') {
      const from = dayjs().startOf('isoWeek').add(periodOffset * 2, 'week');
      return { from, to: from.add(13, 'day').endOf('day') };
    }
    const anchor = dayjs().add(periodOffset, 'month');
    return { from: anchor.startOf('month'), to: anchor.endOf('month') };
  }, [periodMode, periodOffset, customRange]);

  const { lang } = useLanguage();
  // Month + year of the shown period — sits above «Personal (N)» in the corner (owner 12.11).
  const monthLabel = useMemo(() => {
    const fmt = (d) => d.toDate().toLocaleDateString(lang, { month: 'long', year: 'numeric' });
    const a = fmt(periodRange.from);
    const b = fmt(periodRange.to);
    if (a === b) return a;
    return periodRange.from.year() === periodRange.to.year()
      ? `${periodRange.from.toDate().toLocaleDateString(lang, { month: 'long' })} – ${b}`
      : `${a} – ${b}`;
  }, [periodRange, lang]);
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
    update: updateAssignment,
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
  const [orderInit, setOrderInit] = useState(null); // { date, start, end, workerIds } from a dragged range
  // Undo for the last change (Ångra): bookings to bring back + bookings to remove again.
  const [undo, setUndo] = useState(null); // { label, restore: [doc], removeIds: [id], update: [{id, prev}] }
  const undoTimer = useRef(null);
  const recordUndo = useCallback((label, restore = [], removeIds = [], update = []) => {
    if (!restore.length && !removeIds.length && !update.length) return;
    clearTimeout(undoTimer.current);
    setUndo({ label, restore, removeIds, update });
    undoTimer.current = setTimeout(() => setUndo(null), 12000);
  }, []);
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

  const docsOf = useCallback((ids) => {
    const set = new Set((ids || []).map(String));
    return assignments.filter((a) => set.has(String(a._id || a.id)));
  }, [assignments]);
  const toPayload = (a) => ({
    userId: normalizeId(a.userId),
    ...(normalizeId(a.projectId) ? { projectId: normalizeId(a.projectId) } : {}),
    date: typeof a.date === 'string' ? a.date.slice(0, 10) : dayjs(a.date).format('YYYY-MM-DD'),
    hours: Number(a.hours) || 8,
    ...(a.startTime ? { startTime: a.startTime } : {}),
    ...(a.note ? { note: a.note } : {}),
  });
  const runUndo = useCallback(async () => {
    if (!undo) return;
    const u = undo;
    setUndo(null);
    clearTimeout(undoTimer.current);
    await Promise.all([
      ...u.removeIds.map((id) => removeAssignment(id).catch(() => null)),
      ...u.restore.map((a) => createAssignment(toPayload(a)).catch(() => null)),
      ...u.update.map(({ id, prev }) => updateAssignment(id, prev).catch(() => null)),
    ]);
    refetchAssignments();
  }, [undo, removeAssignment, createAssignment, updateAssignment, refetchAssignments]);

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

  // People column with checkboxes next to the timeline (owner 12.11): switched-off people are hidden.
  const [hiddenPeople, setHiddenPeople] = useState([]);
  const [hiddenReady, setHiddenReady] = useState(false);
  useEffect(() => {
    try { setHiddenPeople(JSON.parse(window.localStorage.getItem('planering-hidden') || '[]')); } catch { /* keep all on */ }
    setHiddenReady(true);
  }, []);
  useEffect(() => {
    if (!hiddenReady) return;
    try { window.localStorage.setItem('planering-hidden', JSON.stringify(hiddenPeople)); } catch { /* ignore */ }
  }, [hiddenPeople, hiddenReady]);
  const togglePerson = (id) => setHiddenPeople((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  const shownEmployees = useMemo(
    () => employeeRows.filter((r) => !hiddenPeople.includes(String(r.id))),
    [employeeRows, hiddenPeople],
  );
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
  // Stable colour per person: ordered by id (creation order), not by the row
  // order on screen — so a person keeps their colour when rows re-sort.
  const workerColorMap = useMemo(() => {
    const m = new Map();
    [...employeeRows.map((r) => String(r.id))].sort().forEach((id, i) => m.set(id, EVENT_COLORS[i % EVENT_COLORS.length]));
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
      const projectId = normalizeId(a.projectId) || '';
      if (!workerId || !a.date) return;
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
          title: projectId ? (projectMap[projectId]?.name || 'Project') : t('No project'),
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
  }, [assignments, projectMap, projectColorMap, workerColorMap, hoursByCell, t]);

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
      // Free day → handled on mouse-up (click = one day, drag = a range of days).
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
    const deletedDocs = docsOf(toDelete);
    const created = await Promise.all([
      ...toCreate.map((date) => createAssignment({ userId: editBar.workerId, projectId, date }).catch(() => null)),
      ...toDelete.map((id) => removeAssignment(id).then(() => null).catch(() => null)),
    ]);
    recordUndo(t('Saved'), deletedDocs, created.filter(Boolean).map((c) => c._id || c.id));
    setEditBar(null);
    refetchAssignments();
  }, [editBar, removeAssignment, createAssignment, refetchAssignments, docsOf, recordUndo, t]);

  const handleDeleteBar = useCallback(async () => {
    if (!editBar) return;
    const deletedDocs = docsOf(editBar.ids);
    await Promise.all(editBar.ids.map((id) => removeAssignment(id).catch(() => null)));
    recordUndo(t('Deleted'), deletedDocs);
    setEditBar(null);
    refetchAssignments();
  }, [editBar, removeAssignment, refetchAssignments, docsOf, recordUndo, t]);

  const handleCreateAssign = useCallback(async ({ workerIds, projectId, from, to, hours, startTime }) => {
    const days = enumerateDays(from, to);
    await Promise.all(workerIds.flatMap((userId) => days.map((date) => (
      createAssignment({ userId, projectId, date, hours, ...(startTime ? { startTime } : {}) }).catch(() => null)
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
    const shown = new Set(shownEmployees.map((r) => String(r.id)));
    return [...assignmentBars, ...extra].filter((it) => shown.has(String(it.group)));
  }, [mode, projects, assignmentBars, employeeRows, shownEmployees, periodRange, absentCells, hoursByCell, t]);

  // Week / 2 weeks = Google-Calendar view (hours on the left); Month / Custom = timeline (owner 12.11: back to Google view).
  const showCalendar = mode === 'employees' && (periodMode === '1w' || periodMode === '2w');
  const calDays = useMemo(
    () => enumerateDays(periodRange.from.format('YYYY-MM-DD'), periodRange.to.format('YYYY-MM-DD')),
    [periodRange],
  );
  const calVisible = useMemo(() => new Set(shownEmployees.map((r) => String(r.id))), [shownEmployees]);
  const handleCalRange = useCallback((date, start, end, dateTo) => {
    setOrderInit({ date, dateTo: dateTo || date, start, end, workerIds: calVisible.size === 1 ? [...calVisible] : [] });
  }, [calVisible]);
  const reloadProjects = useCallback(() => {
    if (user?.role === 'companyAdmin' && user?.companyId) return fetchProjectsByCompany(user.companyId);
    return fetchMy();
  }, [user, fetchProjectsByCompany, fetchMy]);

  // Create or edit a work order from the calendar: client (existing or new),
  // order fields, then the workers' bookings for every day of the range.
  const handleOrderSave = useCallback(async ({ existingId, title, order = {}, clientId, newClient, from, to, weekdaysOnly, start, hours, workerIds, address, rows, note = '', files = [] }) => {
    const noteField = note ? { note } : {};
    // Documents / photos from the booking window go to the order's documents (owner 12.11).
    const uploadFiles = async (pid) => {
      if (!pid || !files.length) return;
      const fd = new FormData();
      files.forEach((f) => fd.append('documents', f));
      await apiClient.post(`/projects/${pid}/documents`, fd).catch(() => appMessage.error(t('Could not save')));
    };
    try {
      // Add this booking (time, crew, articles) to an order that already exists.
      if (existingId && !orderInit?.projectId) {
        const days = enumerateDays(from, to).filter((d) => !weekdaysOnly || ![0, 6].includes(dayjs(d).day()));
        if (rows.length) {
          const prev = projectMap[existingId]?.orderRows || [];
          await apiClient.put(`/projects/${existingId}`, { orderRows: [...prev, ...rows] });
        }
        const created = await Promise.all(workerIds.flatMap((userId) => days.map((date) => (
          createAssignment({ userId, projectId: existingId, date, hours, startTime: start, ...noteField }).catch(() => null)
        ))));
        await uploadFiles(existingId);
        recordUndo(t('Saved'), [], created.filter(Boolean).map((c) => c._id || c.id));
        setOrderInit(null);
        reloadProjects();
        refetchAssignments();
        return;
      }
      let cid = clientId;
      if (newClient) {
        // Same fields as the Kunder create form; empty ones are left out.
        const body = Object.fromEntries(Object.entries(newClient).filter(([, v]) => v !== '' && v !== null && v !== undefined));
        if (newClient.clientType === 'private') { delete body.companyName; delete body.orgNumber; delete body.vatNumber; delete body.contactPerson; }
        else { delete body.firstName; delete body.lastName; delete body.personalNumber; }
        const { data: c } = await apiClient.post('/clients', body);
        cid = c?._id || c?.id || null;
      }
      const { toolIds = [], ...orderFields } = order;
      const cleanOrder = Object.fromEntries(Object.entries(orderFields).filter(([, v]) => v !== '' && v !== null && v !== undefined));
      const payload = {
        ...cleanOrder,
        name: title,
        beginningDate: from,
        endDate: to,
        workers: workerIds,
        location: address,
        orderRows: rows,
        clientId: cid || null,
      };
      let projectId = orderInit?.projectId;
      const wanted = enumerateDays(from, to).filter((d) => !weekdaysOnly || ![0, 6].includes(dayjs(d).day()));
      if (projectId) {
        // Editing: only the order's own fields — never rewrite a project's team or dates from one booking.
        await apiClient.put(`/projects/${projectId}`, { ...cleanOrder, name: title, location: address, orderRows: rows, clientId: cid || null });
        // Change only the difference: removed people / days out of range go,
        // new people / days come, kept bookings get the new time.
        const oldDocs = docsOf(orderInit.assignmentIds);
        const dayOf = (a) => (typeof a.date === 'string' ? a.date.slice(0, 10) : dayjs(a.date).format('YYYY-MM-DD'));
        const keepWorkers = new Set(workerIds.map(String));
        const toDelete = oldDocs.filter((a) => !keepWorkers.has(String(normalizeId(a.userId))) || dayOf(a) < from || dayOf(a) > to);
        const kept = oldDocs.filter((a) => !toDelete.includes(a));
        const have = new Set(kept.map((a) => `${normalizeId(a.userId)}|${dayOf(a)}`));
        const toUpdate = kept.filter((a) => (a.startTime || '07:00') !== start || Number(a.hours) !== hours || (a.note || '') !== note);
        const created = await Promise.all([
          ...workerIds.flatMap((userId) => wanted
            .filter((date) => !have.has(`${userId}|${date}`))
            .map((date) => createAssignment({ userId, projectId, date, hours, startTime: start, ...noteField }).catch(() => null))),
          ...toDelete.map((a) => removeAssignment(a._id || a.id).then(() => null).catch(() => null)),
          ...toUpdate.map((a) => updateAssignment(a._id || a.id, { startTime: start, hours, note }).then(() => null).catch(() => null)),
        ]);
        recordUndo(t('Saved'), toDelete, created.filter(Boolean).map((c) => c._id || c.id),
          toUpdate.map((a) => ({ id: a._id || a.id, prev: { startTime: a.startTime || '07:00', hours: Number(a.hours) || 8, note: a.note || '' } })));
      } else {
        const { data: project } = await apiClient.post('/projects', { orderType: 'service', ...payload });
        projectId = project?._id || project?.id;
        await Promise.all(workerIds.flatMap((userId) => wanted.map((date) => (
          createAssignment({ userId, projectId, date, hours, startTime: start, ...noteField }).catch(() => null)
        ))));
      }
      await uploadFiles(projectId);
      if (toolIds.length && projectId) {
        await apiClient.post('/tools/attach-to-project', { projectId, toolIds }).catch(() => null);
      }
      setOrderInit(null);
      reloadProjects();
      refetchAssignments();
      appMessage.success(t(orderInit?.projectId ? 'Saved' : 'Order created'));
    } catch (err) {
      appMessage.error(err?.response?.data?.message || t('Could not save'));
    }
  }, [orderInit, projectMap, createAssignment, removeAssignment, updateAssignment, refetchAssignments, reloadProjects, docsOf, recordUndo, t]);

  // Delete removes only the person whose block was clicked — never the whole crew.
  const handleOrderDelete = useCallback(async () => {
    if (!orderInit?.assignmentIds) return;
    const docs = docsOf(orderInit.assignmentIds).filter((a) => String(normalizeId(a.userId)) === String(orderInit.clickedWorkerId));
    await Promise.all(docs.map((a) => removeAssignment(a._id || a.id).catch(() => null)));
    recordUndo(t('Deleted'), docs);
    setOrderInit(null);
    refetchAssignments();
  }, [orderInit, removeAssignment, refetchAssignments, docsOf, recordUndo, t]);

  const handleCalItem = useCallback((a) => {
    const workerId = normalizeId(a.userId);
    const day = typeof a.date === 'string' ? a.date.slice(0, 10) : dayjs(a.date).format('YYYY-MM-DD');
    const pid = normalizeId(a.projectId);
    if (pid) {
      const project = projectMap[pid] || {};
      const same = assignments.filter((x) => normalizeId(x.projectId) === pid);
      const dayOf = (x) => (typeof x.date === 'string' ? x.date.slice(0, 10) : dayjs(x.date).format('YYYY-MM-DD'));
      const dayList = same.map(dayOf).sort();
      const startTime = a.startTime || '07:00';
      const [h, m] = startTime.split(':').map(Number);
      const endMin = h * 60 + m + Math.round((Number(a.hours) || 8) * 60);
      setOrderInit({
        projectId: pid,
        project,
        title: project.name || '',
        clientId: normalizeId(project.clientId) || null,
        address: project.location || '',
        rows: project.orderRows || [],
        date: dayList[0] || day,
        dateTo: dayList[dayList.length - 1] || day,
        start: startTime,
        end: `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`,
        workerIds: [...new Set(same.map((x) => normalizeId(x.userId)).filter(Boolean))],
        note: a.note || '',
        assignmentIds: same.map((x) => x._id || x.id),
        clickedWorkerId: workerId,
        clickedWorkerName: userMap[workerId]?.name || '',
      });
      return;
    }
    setEditBar({ workerId, projectId: normalizeId(a.projectId) || '', dates: [day], ids: [a._id || a.id], workerName: userMap[workerId]?.name || 'Employee' });
  }, [userMap, projectMap, assignments]);

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

  // Drag across free days of one person → «Ny bokning» for that range, 08:00–10:00 (owner 12.11).
  const dragRef = useRef(null);
  const [dragSel, setDragSel] = useState(null); // { workerId, a, b } while dragging
  useEffect(() => {
    const up = () => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      setDragSel(null);
      const [from, to] = [d.a, d.b].sort();
      setOrderInit({ date: from, dateTo: to, start: '08:00', end: '10:00', workerIds: [d.workerId] });
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);
  const inDrag = (workerId, date) => {
    if (!dragSel || dragSel.workerId !== workerId) return false;
    const [from, to] = [dragSel.a, dragSel.b].sort();
    return date >= from && date <= to;
  };

  const renderItem = ({ item, itemContext, getItemProps }) => {
    if (item.kind === 'placeholder' || item.kind === 'absence') {
      const ph = item.kind === 'placeholder' ? item.meta : null;
      const { key, ...props } = getItemProps({
        className: `schedule-page__slot schedule-page__slot--${item.kind}${ph && inDrag(ph.workerId, ph.date) ? ' is-selected' : ''}`,
        style: { background: 'transparent', border: 'none', boxShadow: 'none' },
      });
      // Free day: no "+" (owner 12.11) — the cell stays clickable, empty.
      const label = item.kind === 'absence' ? item.title : '';
      const dragProps = ph ? {
        onMouseDown: (e) => {
          props.onMouseDown?.(e);
          if (e.button !== 0) return;
          dragRef.current = { workerId: ph.workerId, a: ph.date, b: ph.date };
          setDragSel(dragRef.current);
        },
        onMouseEnter: () => {
          const d = dragRef.current;
          if (!d || d.workerId !== ph.workerId) return;
          dragRef.current = { ...d, b: ph.date };
          setDragSel(dragRef.current);
        },
      } : {};
      return (
        <div key={key} {...props} {...dragProps}>
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
      {mode === 'employees' ? (() => {
        // People column = the same coloured checkbox list as in Vecka / 2 veckor, no photos (owner 12.11).
        const id = String(group.id);
        const on = !hiddenPeople.includes(id);
        const color = workerColorMap.get(id) || EVENT_COLORS[0];
        return (
          <label className={`schedule-cal-people__row${on ? '' : ' is-off'}`}>
            <input type="checkbox" checked={on} onChange={() => togglePerson(id)} />
            <span className="schedule-cal-people__box" style={on ? { background: color, borderColor: color } : { borderColor: color }} aria-hidden="true" />
            <span className="schedule-cal-people__name">{group.title}</span>
          </label>
        );
      })() : (
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
        toggleRow={(
          <>
            {scheduleTab === 'planering' ? (
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
                  </>
                ) : null}
              </>
            ) : null}
            <span className="grid-workspace-header__spacer" />
            {/* Planering / Ändringslogg tabs on the right of the "Plan for" row (owner 12.11). */}
            <Tabs
              className="schedule-page__tabs"
              activeKey={scheduleTab}
              onChange={setScheduleTab}
              items={[
                { key: 'planering', label: t('Schedule') },
                { key: 'changes', label: t('Changes log') },
              ]}
            />
          </>
        )}
        periodRow={scheduleTab === 'planering' ? (
          <>
            <Segmented
              value={periodMode}
              onChange={setPeriodMode}
              options={[
                { value: '1w', label: t('Week') },
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

            {showCalendar ? null : (
            <div className="schedule-page__zoom">
              <IconButton onClick={() => handleZoom(ZOOM_OUT_FACTOR)} disabled={!canZoomOut} aria-label={t('Zoom out')}>
                <ZoomOutOutlined />
              </IconButton>
              <IconButton onClick={() => handleZoom(ZOOM_IN_FACTOR)} disabled={!canZoomIn} aria-label={t('Zoom in')}>
                <ZoomInOutlined />
              </IconButton>
            </div>
            )}
          </>
        ) : null}
      />

      {scheduleTab === 'changes' ? (
        <AssignmentChangesLog />
      ) : showCalendar ? (
        <Spin spinning={isLoading}>
          <div className="schedule-cal-wrap schedule-cal-wrap--joined">
      {mode === 'employees' ? (
        <aside className="schedule-cal-people">
          {/* Same people column as in Månad: header cell level with the date header, list below (owner 12.11). */}
          <div className="schedule-cal-people__title">
            <span className="schedule-corner__month">{monthLabel}</span>
            <span>{`${t('Staff')} (${employeeRows.length})`}</span>
          </div>
          {employeeRows.map((r) => {
            const id = String(r.id);
            const on = !hiddenPeople.includes(id);
            const color = workerColorMap.get(id) || EVENT_COLORS[0];
            return (
              <label key={id} className="schedule-cal-people__row">
                <input type="checkbox" checked={on} onChange={() => togglePerson(id)} />
                <span className="schedule-cal-people__box" style={on ? { background: color, borderColor: color } : { borderColor: color }} aria-hidden="true" />
                <span className="schedule-cal-people__name">{r.title}</span>
              </label>
            );
          })}
        </aside>
      ) : null}
          <ScheduleCalendar
            days={calDays}
            assignments={assignments}
            visibleWorkerIds={calVisible}
            userMap={userMap}
            projectMap={projectMap}
            colorFor={(uid) => workerColorMap.get(String(uid)) || EVENT_COLORS[0]}
            lang={lang}
            t={t}
            onRangeSelect={handleCalRange}
            onItemClick={handleCalItem}
          />
          </div>
        </Spin>
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
                      <span className="schedule-corner__month">{monthLabel}</span>
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
                    const text = !(w > 0) || w >= 40 ? formatDayLabel(d, lang) : w >= 14 ? String(d.getDate()) : '';
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
      <OrderQuickModal
        open={!!orderInit}
        initial={orderInit}
        employees={workerOptions}
        orders={projects.filter((p) => !p.internal)}
        onEmployeeAdded={() => (user?.companyId ? fetchUsersByCompany(user.companyId) : null)}
        onCancel={() => setOrderInit(null)}
        onSave={handleOrderSave}
        onDelete={handleOrderDelete}
        deleteLabel={orderInit?.clickedWorkerName ? `${t('Remove')} ${orderInit.clickedWorkerName}` : undefined}
      />
      <AssignmentCreateModal
        open={assignOpen}
        initial={assignInit}
        employees={workerOptions}
        projects={projects}
        onCancel={() => { setAssignOpen(false); setAssignInit(null); }}
        onCreate={handleCreateAssign}
      />
      {undo ? (
        <div className="schedule-undo" role="status">
          <span>{undo.label}</span>
          <button type="button" onClick={runUndo}>{t('Undo')}</button>
          <button type="button" className="schedule-undo__x" aria-label={t('Close')} onClick={() => setUndo(null)}>×</button>
        </div>
      ) : null}
    </section>
  );
}
