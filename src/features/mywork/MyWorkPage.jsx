'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, Empty, Popconfirm, Popover, Segmented, Spin, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, DeleteOutlined, EyeOutlined, FlagFilled, HolderOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import AdminModal from '@/src/shared/components/AdminModal';
import TaskCreateForm from '@/src/features/tasks/components/TaskCreateForm';
import { PaymentsDueBlock } from '@/src/features/dashboard/EconomyOverview';
import { useEconomyData } from '@/src/features/dashboard/useEconomyData';
import { useMyWorkLayout, MYWORK_OPTIONAL_BLOCKS } from '@/src/features/mywork/useMyWorkLayout';
import { useTaskStore } from '@/src/store/taskStore';
import { useApprovalsStore } from '@/src/store/approvalsStore';
import { useAuthStore } from '@/src/store/authStore';
import { useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useT } from '@/src/i18n/LanguageProvider';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { getEntityId } from '@/src/utils/entityId';
import { formatSek } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { parseQuickTask, dueChipLabel } from '@/src/utils/parseQuickTask';
import '@/src/features/tasks/MyTasksPage.scss';
import './MyWorkPage.scss';

const idOf = (v) => (v && typeof v === 'object' ? v._id || v.id : v);
const nameOf = (v) => (v && typeof v === 'object' ? v.name : null);
const DAY = 86400000;
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };
const APPROVALS_INLINE_LIMIT = 5;

const APPROVAL_TYPE = {
  expense: { label: 'Expense', tone: 'amber' },
  supplier: { label: 'Supplier invoice', tone: 'blue' },
  leave: { label: 'Leave', tone: 'purple' },
  certificate: { label: 'Certificate', tone: 'red' },
};

// Eisenhower quadrants + the 4D action each implies.
const QUADRANTS = [
  { key: 'do', label: 'Do now', sub: 'Important & urgent', tone: 'do' },
  { key: 'decide', label: 'Plan it', sub: 'Important, not urgent', tone: 'decide' },
  { key: 'delegate', label: 'Delegate', sub: 'Urgent, not important', tone: 'delegate' },
  { key: 'skip', label: 'Skip', sub: 'Neither', tone: 'skip' },
];

// Working hours shown in the day-plan timeline.
const PLAN_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

// Day columns shown in the "Days" board view (today + the next N-1 days).
const DAY_COLUMNS = 6;
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const dateKeyOf = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// "Mitt arbete" — one Today-first surface that merges the approvals inbox
// (Att göra) with personal tasks (Mina uppgifter), grouped by time horizon so
// what needs attention today rises to the top.
export default function MyWorkPage() {
  const t = useT();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const myId = user?.id || user?._id || user?.userId;
  const { tasks, loading, fetchAllAccessible, complete, reopen, remove } = useTaskStore();
  const {
    expenses, supplier, leave, certificates, fetchAll: fetchApprovals,
    approveExpense, rejectExpense, approveSupplier, approveLeave, rejectLeave,
  } = useApprovalsStore();
  const { isOn, toggle, order, moveBefore, reset, isCustomized } = useMyWorkLayout();
  const [dragKey, setDragKey] = useState(null);
  const [planDragId, setPlanDragId] = useState(null); // task dragged onto the day-plan rail
  const [planDragOverHour, setPlanDragOverHour] = useState(null);
  const economy = useEconomyData();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('normal');
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [now] = useState(() => Date.now());
  const [view, setView] = useState('list');
  const [planOpen, setPlanOpen] = useState(false);
  const [planSelected, setPlanSelected] = useState(() => new Set());
  const [planning, setPlanning] = useState(false);
  const [dayPlan, setDayPlan] = useState({}); // { taskId: hour } — today's time blocks
  const [pickTask, setPickTask] = useState(null); // task awaiting a slot (click-to-place)
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSelected, setReviewSelected] = useState(() => new Set());
  const [reviewing, setReviewing] = useState(false);
  const [dayAdd, setDayAdd] = useState({}); // per-day-column quick-add text
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const inputRef = useRef(null);

  const dayKey = useMemo(() => dateKeyOf(now), [now]);
  const planStorageKey = `byggexp.dayplan.${dayKey}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(planStorageKey);
      setDayPlan(raw ? (JSON.parse(raw) || {}) : {});
    } catch { setDayPlan({}); }
  }, [planStorageKey]);

  const savePlan = (next) => {
    setDayPlan(next);
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(planStorageKey, JSON.stringify(next)); } catch { /* ignore */ }
    }
  };

  useEffect(() => {
    fetchAllAccessible();
    fetchApprovals();
  }, [fetchAllAccessible, fetchApprovals]);

  // Resolve names for the people behind expenses / leave requests.
  const approverIds = useMemo(
    () => [...expenses, ...leave].map((item) => item.userId).filter(Boolean),
    [expenses, leave],
  );
  const { users } = useUsersInfo(approverIds);
  const approverName = (userId) => users[userId]?.name || users[String(userId)]?.name || '—';

  // A task is "mine" when I'm its personal assignee, or when I'm one of the
  // chosen assignees on a project task (notificationSettings.assignees).
  const mine = useMemo(
    () =>
      tasks.filter((task) => {
        if (idOf(task.assigneeUserId) === myId) return true;
        const assignees = task.notificationSettings?.assignees;
        return (
          Array.isArray(assignees) &&
          assignees.some((assignee) => idOf(assignee?.id) === myId)
        );
      }),
    [tasks, myId],
  );

  const groups = useMemo(() => {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startMs = startOfToday.getTime();
    const todayEnd = startMs + DAY;

    const overdue = [];
    const today = [];
    const upcoming = [];
    const someday = [];
    const done = [];

    for (const task of mine) {
      if (task.status === 'completed') { done.push(task); continue; }
      const due = task.dueDate ? new Date(task.dueDate).getTime() : null;
      if (due === null) someday.push(task);
      else if (due < startMs) overdue.push(task);
      else if (due < todayEnd) today.push(task);
      else upcoming.push(task);
    }

    const rank = (task) => PRIORITY_RANK[task.priority] ?? 1;
    const byPriorityThenDue = (a, b) =>
      rank(a) - rank(b) || new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
    const byDue = (a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0);

    overdue.sort(byPriorityThenDue);
    today.sort(byPriorityThenDue);
    upcoming.sort(byDue);
    someday.sort(byPriorityThenDue);
    done.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    return { overdue, today, upcoming, someday, done: done.slice(0, 15) };
  }, [mine, now]);

  // Eisenhower matrix: important = high priority, urgent = due today or earlier.
  const matrix = useMemo(() => {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const todayEnd = startOfToday.getTime() + DAY;
    const buckets = { do: [], decide: [], delegate: [], skip: [] };
    for (const task of mine) {
      if (task.status === 'completed') continue;
      const important = task.priority === 'high';
      const due = task.dueDate ? new Date(task.dueDate).getTime() : null;
      const urgent = due !== null && due < todayEnd;
      if (important && urgent) buckets.do.push(task);
      else if (important && !urgent) buckets.decide.push(task);
      else if (!important && urgent) buckets.delegate.push(task);
      else buckets.skip.push(task);
    }
    return buckets;
  }, [mine, now]);

  // Candidates for the "Plan the day" ritual: everything open that isn't already
  // due today — overdue to reschedule, plus upcoming / undated to pull forward.
  const planCandidates = useMemo(
    () => [...groups.overdue, ...groups.upcoming, ...groups.someday],
    [groups],
  );

  // All accessible upcoming task deadlines (not only mine) — a wider radar than
  // the personal "Kommande" section.
  const deadlines = useMemo(() => {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const startMs = start.getTime();
    return tasks
      .filter((task) => task.status !== 'completed' && task.dueDate && new Date(task.dueDate).getTime() >= startMs)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 6);
  }, [tasks, now]);

  const approvalRows = useMemo(() => {
    const list = [];
    expenses.forEach((expense) => list.push({
      key: `expense-${getEntityId(expense)}`, id: getEntityId(expense), type: 'expense',
      primary: expense.supplierName || expense.category || t('Expense'),
      secondary: approverName(expense.userId),
      amount: expense.amount,
    }));
    supplier.forEach((invoice) => list.push({
      key: `supplier-${getEntityId(invoice)}`, id: getEntityId(invoice), type: 'supplier',
      primary: invoice.supplierName || '—',
      secondary: invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : '',
      amount: invoice.total,
    }));
    leave.forEach((request) => list.push({
      key: `leave-${getEntityId(request)}`, id: getEntityId(request), type: 'leave',
      primary: approverName(request.userId),
      secondary: [request.type, [request.startDate, request.endDate].filter(Boolean).join(' – ')].filter(Boolean).join(' · '),
      amount: null,
    }));
    certificates.forEach((cert) => list.push({
      key: `certificate-${cert.userId}-${cert.certId || cert.name}`, id: cert.userId, type: 'certificate',
      primary: `${cert.name} · ${cert.userName}`,
      secondary: cert.status === 'expired' ? t('Expired') : t('Expiring soon'),
      amount: null,
    }));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, supplier, leave, certificates, users, t]);

  const approvalsCount = approvalRows.length;

  const parsed = useMemo(() => parseQuickTask(title, now), [title, now]);
  const detectedChip = useMemo(() => {
    const bits = [];
    const dl = dueChipLabel(parsed.dueMs, now, t);
    if (dl) bits.push(`📅 ${dl}`);
    if (parsed.dueHour != null && parsed.dueMs != null) {
      const d = new Date(parsed.dueMs);
      bits.push(`🕐 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }
    if (parsed.priority === 'high') bits.push(`🚩 ${t('High')}`);
    return bits.length ? `${t('Detected')}: ${bits.join(' · ')}` : null;
  }, [parsed, now, t]);

  const greeting = useMemo(() => {
    const hour = new Date(now).getHours();
    if (hour < 11) return t('Good morning');
    if (hour < 18) return t('Good afternoon');
    return t('Good evening');
  }, [now, t]);

  const dateLabel = useMemo(() => {
    try {
      return new Date(now).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch {
      return '';
    }
  }, [now]);

  const dueLabel = (task) => {
    if (!task.dueDate) return null;
    const day = new Date(task.dueDate);
    day.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((day.getTime() - today.getTime()) / DAY);
    if (diff === 0) return { text: t('Today'), tone: 'today' };
    if (diff === 1) return { text: t('Tomorrow'), tone: 'soon' };
    if (diff < 0) return { text: t('{n} d overdue').replace('{n}', String(-diff)), tone: 'over' };
    if (diff <= 7) return { text: t('In {n} d').replace('{n}', String(diff)), tone: 'soon' };
    return { text: new Date(task.dueDate).toLocaleDateString(), tone: 'later' };
  };

  const quickAdd = async () => {
    const result = parseQuickTask(title, Date.now());
    const text = result.title.trim();
    if (!text || saving) return;
    setSaving(true);
    const nowMs = Date.now();
    // No date typed → default to today (end of workday) so the task lands in the
    // Today section right away, not 7 days out in Upcoming.
    let due;
    if (result.dueMs != null) {
      due = new Date(result.dueMs);
    } else {
      due = new Date(nowMs);
      due.setHours(17, 0, 0, 0);
    }
    const finalPriority = result.priority === 'high' ? 'high' : priority;
    try {
      const res = await apiClient.post('/tasks', {
        taskTitle: text,
        status: 'open',
        priority: finalPriority,
        startDate: new Date(nowMs).toISOString(),
        dueDate: due.toISOString(),
        assigneeUserId: myId,
      });
      // If a time of day was typed (e.g. "kl 14") and it's due today, drop the
      // new task straight onto that hour in Today's plan.
      const newId = res?.data?._id || res?.data?.task?._id;
      const dueIsToday = new Date(due).toDateString() === new Date(nowMs).toDateString();
      if (newId && result.dueHour != null && dueIsToday && PLAN_HOURS.includes(result.dueHour)) {
        assignHour(newId, result.dueHour);
      }
      setTitle('');
      setPriority('normal');
      await fetchAllAccessible();
      setTimeout(() => inputRef.current?.focus(), 10);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not add task'));
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (task) => { setEditingTask(task); setModalOpen(true); };
  const closeEditor = () => { setModalOpen(false); setEditingTask(null); fetchAllAccessible(); };

  const openPlan = () => {
    // Pre-check the overdue ones — they most need rescheduling to today.
    setPlanSelected(new Set(groups.overdue.map((task) => task._id)));
    setPlanOpen(true);
  };
  const togglePlan = (id) => setPlanSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // PUT /tasks payload that keeps the task intact but overrides its due date.
  const taskPayloadWithDue = (task, dueIso) => ({
    taskTitle: task.taskTitle,
    taskDescription: task.taskDescription || '',
    notes: task.notes || '',
    notifications: task.notifications || [],
    startDate: task.startDate || null,
    dueDate: dueIso,
    priority: task.priority || 'normal',
    ...(idOf(task.assigneeUserId) ? { assigneeUserId: idOf(task.assigneeUserId) } : { projectId: idOf(task.projectId) }),
  });

  const rescheduleTasks = async (ids, dueIso) => {
    await Promise.all(ids.map((id) => {
      const task = mine.find((x) => x._id === id);
      return task ? apiClient.put(`/tasks/${id}`, taskPayloadWithDue(task, dueIso)) : null;
    }));
  };

  const endOfToday = () => { const d = new Date(); d.setHours(17, 0, 0, 0); return d.toISOString(); };
  const endOfTomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(17, 0, 0, 0); return d.toISOString(); };

  const confirmPlan = async () => {
    const ids = [...planSelected];
    if (!ids.length) { setPlanOpen(false); return; }
    setPlanning(true);
    try {
      await rescheduleTasks(ids, endOfToday());
      appMessage.success(t('Planned for today'));
      setPlanOpen(false);
      await fetchAllAccessible();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not plan the day'));
    } finally {
      setPlanning(false);
    }
  };

  // --- time-block day plan (stored per-day in localStorage) ---
  const assignHour = (taskId, hour) => savePlan({ ...dayPlan, [taskId]: hour });
  const clearHour = (taskId) => { const next = { ...dayPlan }; delete next[taskId]; savePlan(next); };
  const onSlotClick = (hour) => { if (pickTask) { assignHour(pickTask, hour); setPickTask(null); } };

  // Drop a task (dragged from any list section) onto an hour slot. If it is not
  // already due today, move it to today first so it belongs in today's plan,
  // then place it at that hour.
  const dropTaskOnHour = async (hour) => {
    const id = planDragId;
    setPlanDragId(null);
    setPlanDragOverHour(null);
    if (!id) return;
    const task = mine.find((x) => x._id === id);
    if (!task || task.status === 'completed') return;
    const isToday = groups.today.some((x) => x._id === id);
    if (!isToday) {
      try {
        await rescheduleTasks([id], endOfToday());
        await fetchAllAccessible();
      } catch (err) {
        appMessage.error(err.response?.data?.message || t('Could not plan the day'));
        return;
      }
    }
    assignHour(id, hour);
  };

  const unplannedToday = useMemo(
    () => groups.today.filter((task) => dayPlan[task._id] == null),
    [groups.today, dayPlan],
  );

  const renderDayPlan = () => (
    <aside className="mywork__rail">
      <div className="mywork__rail-card">
        <h3 className="mywork__rail-title">{t('Today’s plan')}</h3>
        <p className="mywork__rail-sub">{pickTask ? t('Click an hour to place it') : t('Drag a task here, or pick one then an hour')}</p>
        <div className={`mywork__timeline${planDragId ? ' mywork__timeline--dragging' : ''}`}>
          {PLAN_HOURS.map((hour) => {
            const blocks = groups.today.filter((task) => dayPlan[task._id] === hour);
            return (
              <div
                key={hour}
                className={`mywork__slot${planDragOverHour === hour ? ' mywork__slot--target' : ''}`}
                data-h={`${String(hour).padStart(2, '0')}:00`}
                onClick={() => onSlotClick(hour)}
                onDragOver={(e) => { if (planDragId) { e.preventDefault(); setPlanDragOverHour(hour); } }}
                onDragLeave={() => setPlanDragOverHour((h) => (h === hour ? null : h))}
                onDrop={() => dropTaskOnHour(hour)}
              >
                {blocks.map((task) => (
                  <button
                    key={task._id}
                    type="button"
                    className={`mywork__block mywork__block--${task.priority || 'normal'}${planDragId === task._id ? ' mywork__block--dragging' : ''}`}
                    draggable
                    title={t('Drag to move · click to remove')}
                    onDragStart={(e) => { e.stopPropagation(); setPlanDragId(task._id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { setPlanDragId(null); setPlanDragOverHour(null); }}
                    onClick={(e) => { e.stopPropagation(); clearHour(task._id); }}
                  >
                    {task.taskTitle}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        {unplannedToday.length ? (
          <div className="mywork__unplanned">
            <div className="mywork__unplanned-head">{t('Not scheduled')}</div>
            {unplannedToday.map((task) => (
              <button
                key={task._id}
                type="button"
                className={`mywork__pill${pickTask === task._id ? ' is-sel' : ''}`}
                onClick={() => setPickTask(pickTask === task._id ? null : task._id)}
              >
                {task.taskTitle}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );

  const renderDeadlines = () => (
    <div className="mytasks__group">
      <div className="mytasks__group-head mytasks__group-head--today">
        {t('Upcoming deadlines')}<span className="mytasks__count">{deadlines.length}</span>
      </div>
      {deadlines.length ? (
        <div className="mytasks__list">
          {deadlines.map((task) => {
            const project = nameOf(task.projectId);
            const due = dueLabel(task);
            return (
              <div key={task._id} className="mytasks__row mywork__dl-row" role="button" tabIndex={0} onClick={() => openEditor(task)}>
                <span className="mywork__dl-date">{formatAdminDate(task.dueDate)}</span>
                <span className="mywork__dl-title">{task.taskTitle}</span>
                {project ? <span className="mytasks__project">{project}</span> : null}
                {due ? <span className={`mytasks__due mytasks__due--${due.tone}`}>{due.text}</span> : null}
              </div>
            );
          })}
        </div>
      ) : <div className="mywork__empty-line">{t('No upcoming deadlines')}</div>}
    </div>
  );

  const customizeContent = (
    <div className="mywork__customize">
      {MYWORK_OPTIONAL_BLOCKS.map((block) => (
        <label key={block.key} className="mywork__customize-row">
          <Checkbox checked={isOn(block.key)} onChange={() => toggle(block.key)} />
          <span>{t(block.label)}</span>
        </label>
      ))}
      <div className="mywork__customize-hint">{t('Drag the handle at the top of a block to reorder.')}</div>
      {isCustomized ? (
        <button type="button" className="mywork__customize-reset" onClick={reset}>
          {t('Reset layout')}
        </button>
      ) : null}
    </div>
  );

  // --- "Days" board view (Todoist-style day columns) ---
  const dayKeyOfDate = (value) => {
    const x = new Date(value);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };

  const addForDay = async (dateObj) => {
    const key = dayKeyOfDate(dateObj);
    const text = (dayAdd[key] || '').trim();
    if (!text) return;
    const due = new Date(dateObj);
    due.setHours(17, 0, 0, 0);
    try {
      await apiClient.post('/tasks', {
        taskTitle: text,
        status: 'open',
        priority: 'normal',
        startDate: new Date().toISOString(),
        dueDate: due.toISOString(),
        assigneeUserId: myId,
      });
      setDayAdd((prev) => ({ ...prev, [key]: '' }));
      await fetchAllAccessible();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not add task'));
    }
  };

  const rescheduleOverdue = async () => {
    const ids = groups.overdue.map((task) => task._id);
    if (!ids.length) return;
    try {
      await rescheduleTasks(ids, endOfToday());
      await fetchAllAccessible();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not update tasks'));
    }
  };

  // Drag a task card onto another day column to reschedule it to that day.
  const renderDraggableTask = (task) => (
    <div
      key={task._id}
      className="mywork__drag"
      draggable
      onDragStart={(e) => { setDragTaskId(task._id); e.dataTransfer.effectAllowed = 'move'; }}
      onDragEnd={() => { setDragTaskId(null); setDragOverKey(null); }}
    >
      {renderRow(task)}
    </div>
  );

  const dropOnDay = async (dateObj) => {
    const id = dragTaskId;
    setDragTaskId(null);
    setDragOverKey(null);
    if (!id) return;
    const due = new Date(dateObj);
    due.setHours(17, 0, 0, 0);
    try {
      await rescheduleTasks([id], due.toISOString());
      await fetchAllAccessible();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not update tasks'));
    }
  };

  const renderDays = () => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const columns = Array.from({ length: DAY_COLUMNS }, (_, i) => new Date(start.getTime() + i * DAY));
    const openMine = mine.filter((task) => task.status !== 'completed');
    const colLabel = (d, i) => {
      if (i === 0) return t('Today');
      if (i === 1) return t('Tomorrow');
      return t(DOW[(d.getDay() + 6) % 7]);
    };
    return (
      <div className="mywork__days">
        <div className="mywork__daycol mywork__daycol--overdue">
          <div className="mywork__daycol-head">
            <span className="mywork__daycol-title">{t('Overdue')}</span>
            <span className="mywork__daycol-count">{groups.overdue.length}</span>
            {groups.overdue.length ? (
              <button type="button" className="mywork__reschedule" onClick={rescheduleOverdue}>{t('Reschedule')}</button>
            ) : null}
          </div>
          <div className="mywork__daycol-body">
            {groups.overdue.length ? groups.overdue.map(renderDraggableTask) : <div className="mywork__daycol-empty">—</div>}
          </div>
        </div>
        {columns.map((d, i) => {
          const key = dayKeyOfDate(d);
          const items = openMine
            .filter((task) => task.dueDate && dayKeyOfDate(task.dueDate) === key)
            .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1));
          return (
            <div
              key={key}
              className={`mywork__daycol${i === 0 ? ' mywork__daycol--today' : ''}${dragOverKey === key ? ' mywork__daycol--dropover' : ''}`}
              onDragOver={(e) => { if (dragTaskId) { e.preventDefault(); setDragOverKey(key); } }}
              onDragLeave={() => setDragOverKey((prev) => (prev === key ? null : prev))}
              onDrop={() => dropOnDay(d)}
            >
              <div className="mywork__daycol-head">
                <span className="mywork__daycol-title">{colLabel(d, i)}</span>
                <span className="mywork__daycol-date">{d.getDate()}/{d.getMonth() + 1}</span>
                <span className="mywork__daycol-count">{items.length}</span>
              </div>
              <div className="mywork__daycol-body">
                {items.map(renderDraggableTask)}
                <input
                  className="mywork__daycol-add"
                  placeholder={`+ ${t('Add')}`}
                  value={dayAdd[key] || ''}
                  onChange={(e) => setDayAdd((prev) => ({ ...prev, [key]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') addForDay(d); }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- evening review ("Avsluta dagen") ---
  const doneTodayCount = useMemo(
    () => mine.filter((task) => task.status === 'completed' && task.updatedAt && dateKeyOf(task.updatedAt) === dayKey).length,
    [mine, dayKey],
  );
  const reviewCandidates = useMemo(() => [...groups.overdue, ...groups.today], [groups.overdue, groups.today]);

  const openReview = () => {
    setReviewSelected(new Set(reviewCandidates.map((task) => task._id)));
    setReviewOpen(true);
  };

  const confirmReview = async () => {
    const ids = [...reviewSelected];
    setReviewing(true);
    try {
      if (ids.length) await rescheduleTasks(ids, endOfTomorrow());
      const next = { ...dayPlan };
      ids.forEach((id) => { delete next[id]; });
      savePlan(next);
      appMessage.success(ids.length ? t('Carried over to tomorrow') : t('Have a good evening!'));
      setReviewOpen(false);
      await fetchAllAccessible();
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not update tasks'));
    } finally {
      setReviewing(false);
    }
  };

  const renderMatrix = () => (
    <div className="mywork__matrix">
      {QUADRANTS.map((q) => {
        const items = matrix[q.key];
        const count = items.length + (q.key === 'delegate' ? approvalsCount : 0);
        return (
          <div key={q.key} className={`mywork__quad mywork__quad--${q.tone}`}>
            <div className="mywork__quad-head">
              <span className="mywork__quad-label">{t(q.label)}</span>
              <span className="mywork__quad-sub">{t(q.sub)}</span>
              <span className="mywork__quad-count">{count}</span>
            </div>
            <div className="mywork__quad-body">
              {q.key === 'delegate' && approvalsCount ? (
                <button type="button" className="mywork__quad-appr" onClick={() => setView('list')}>
                  {approvalsCount} {t('to approve')} →
                </button>
              ) : null}
              {items.length ? items.map(renderRow) : (
                q.key === 'delegate' && approvalsCount ? null : <div className="mywork__quad-empty">—</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderRow = (task) => {
    const due = dueLabel(task);
    const project = nameOf(task.projectId);
    const isDone = task.status === 'completed';
    const prio = task.priority || 'normal';
    return (
      <div
        key={task._id}
        className={`mytasks__row mytasks__row--${prio}${isDone ? ' mytasks__row--done' : ''}${planDragId === task._id ? ' mytasks__row--dragging' : ''}`}
        draggable={!isDone}
        onDragStart={(e) => { setPlanDragId(task._id); e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => { setPlanDragId(null); setPlanDragOverHour(null); }}
      >
        <Tooltip title={isDone ? t('Reopen') : t('Mark done')}>
          <button
            type="button"
            className={`mytasks__check${isDone ? ' mytasks__check--on' : ''}`}
            aria-label={isDone ? t('Reopen') : t('Mark done')}
            onClick={(e) => { e.stopPropagation(); (isDone ? reopen : complete)(task._id); }}
          >
            {isDone ? <CheckOutlined /> : null}
          </button>
        </Tooltip>
        <button type="button" className="mytasks__body" onClick={() => openEditor(task)}>
          <span className="mytasks__title">
            {prio !== 'normal' && !isDone ? <FlagFilled className={`mytasks__flag mytasks__flag--${prio}`} /> : null}
            {task.taskTitle}
          </span>
          <span className="mytasks__meta">
            {project ? <span className="mytasks__project">{project}</span> : <span className="mytasks__project mytasks__project--personal">{t('Personal')}</span>}
            {due && !isDone ? <span className={`mytasks__due mytasks__due--${due.tone}`}>{due.text}</span> : null}
          </span>
        </button>
        <Popconfirm
          title={t('Delete this task?')}
          okText={t('Delete')}
          cancelText={t('Cancel')}
          okButtonProps={{ danger: true }}
          onConfirm={() => remove(task._id)}
        >
          <button
            type="button"
            className="mytasks__del"
            aria-label={t('Delete')}
            title={t('Delete')}
            onClick={(e) => e.stopPropagation()}
          >
            <DeleteOutlined />
          </button>
        </Popconfirm>
      </div>
    );
  };

  const taskSection = (key, label, items, tone) => items.length ? (
    <div className="mytasks__group" key={key}>
      <div className={`mytasks__group-head mytasks__group-head--${tone}`}>
        {label}<span className="mytasks__count">{items.length}</span>
      </div>
      <div className="mytasks__list">{items.map(renderRow)}</div>
    </div>
  ) : null;

  const renderApprovalRow = (row) => {
    const meta = APPROVAL_TYPE[row.type];
    return (
      <div key={row.key} className="mywork__appr-row">
        <span className={`mywork__appr-type mywork__appr-type--${meta.tone}`}>{t(meta.label)}</span>
        <div className="mywork__appr-main">
          <span className="mywork__appr-primary">{row.primary}</span>
          {row.secondary ? <span className="mywork__appr-secondary">{row.secondary}</span> : null}
        </div>
        {row.amount != null ? <span className="mywork__appr-amount">{formatSek(row.amount, { decimals: false })}</span> : null}
        <div className="mywork__appr-actions">
          {row.type === 'certificate' ? (
            <button type="button" className="mywork__mini" onClick={() => router.push(`/company/users/${row.id}`)}>
              <EyeOutlined /> {t('View')}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="mywork__mini mywork__mini--ok"
                onClick={() => {
                  if (row.type === 'expense') approveExpense(row.id);
                  else if (row.type === 'supplier') approveSupplier(row.id);
                  else approveLeave(row.id);
                }}
              >
                <CheckOutlined /> {t('Approve')}
              </button>
              {row.type !== 'supplier' ? (
                <button
                  type="button"
                  className="mywork__mini mywork__mini--no"
                  aria-label={t('Reject')}
                  onClick={() => (row.type === 'expense' ? rejectExpense(row.id) : rejectLeave(row.id))}
                >
                  <CloseOutlined />
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    );
  };

  // Each main-column block by key, so the list can be rendered (and dragged) in
  // the user's saved order. Returns null when a block is hidden or empty.
  const renderBlock = (key) => {
    switch (key) {
      case 'overdue':
        return taskSection('overdue', t('Overdue'), groups.overdue, 'over');
      case 'today':
        return taskSection('today', t('Today'), groups.today, 'today');
      case 'approvals':
        return isOn('approvals') && approvalsCount ? (
          <div className="mytasks__group">
            <div className="mytasks__group-head mytasks__group-head--appr">
              {t('To approve')}<span className="mytasks__count">{approvalsCount}</span>
            </div>
            <div className="mywork__appr-list">
              {approvalRows.slice(0, APPROVALS_INLINE_LIMIT).map(renderApprovalRow)}
              {approvalsCount > APPROVALS_INLINE_LIMIT ? (
                <button type="button" className="mywork__appr-all" onClick={() => router.push('/company/approvals')}>
                  {t('View all')} {approvalsCount} →
                </button>
              ) : null}
            </div>
          </div>
        ) : null;
      case 'payments':
        return isOn('payments') ? (
          <PaymentsDueBlock {...economy} costsLink="/company/invoicing/supplier-invoices" />
        ) : null;
      case 'deadlines':
        return isOn('deadlines') ? renderDeadlines() : null;
      case 'upcoming':
        return taskSection('upcoming', t('Upcoming'), groups.upcoming, 'todo');
      case 'someday':
        return taskSection('someday', t('Someday'), groups.someday, 'todo');
      case 'done':
        return isOn('done') && groups.done.length ? (
          <div className="mytasks__group">
            <div className="mytasks__group-head mytasks__group-head--done">
              {t('Done')}<span className="mytasks__count">{groups.done.length}</span>
            </div>
            <div className="mytasks__list">{groups.done.map(renderRow)}</div>
          </div>
        ) : null;
      default:
        return null;
    }
  };

  const emptyEverything = !loading
    && !groups.overdue.length && !groups.today.length && !groups.upcoming.length
    && !groups.someday.length && !groups.done.length && !approvalsCount;

  return (
    <div className="mywork">
      <div className="mywork__head">
        <div>
          <h1 className="mywork__greeting">{greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋</h1>
          <div className="mywork__date">{dateLabel}</div>
          <div className="mywork__chips">
            {groups.overdue.length ? <span className="mywork__chip mywork__chip--red">{groups.overdue.length} {t('overdue')}</span> : null}
            <span className="mywork__chip mywork__chip--blue">{groups.today.length} {t('due today')}</span>
            {approvalsCount ? <span className="mywork__chip mywork__chip--amber">{approvalsCount} {t('to approve')}</span> : null}
          </div>
        </div>
        <div className="mywork__head-actions">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: t('List') },
              { value: 'days', label: t('Days') },
              { value: 'matrix', label: t('Prioritize') },
            ]}
          />
          <button type="button" className="mywork__plan-btn" onClick={openPlan}>✦ {t('Plan the day')}</button>
          <button type="button" className="mywork__plan-btn mywork__plan-btn--ghost" onClick={openReview}>🌙 {t('End the day')}</button>
          <Popover content={customizeContent} title={t('Customize')} trigger="click" placement="bottomRight">
            <button type="button" className="mywork__plan-btn mywork__plan-btn--ghost" aria-label={t('Customize')}>
              <SettingOutlined />
            </button>
          </Popover>
        </div>
      </div>

      <div className="mytasks__addwrap">
        <div className="mytasks__add">
          <PlusOutlined className="mytasks__add-icon" />
          <input
            ref={inputRef}
            className="mytasks__add-input"
            value={title}
            placeholder={t('Add a task for yourself…')}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') quickAdd(); }}
          />
          <Segmented
            size="small"
            value={parsed.priority === 'high' ? 'high' : priority}
            onChange={setPriority}
            options={[
              { value: 'low', label: t('Low') },
              { value: 'normal', label: t('Normal') },
              { value: 'high', label: t('High') },
            ]}
          />
          <button type="button" className="mytasks__add-btn" onClick={quickAdd} disabled={saving || !parsed.title.trim()}>
            {t('Add')}
          </button>
        </div>
        {detectedChip ? <div className="mytasks__detected">{detectedChip}</div> : null}
      </div>

      {loading && !mine.length && !approvalsCount ? (
        <div className="mytasks__spin"><Spin /></div>
      ) : emptyEverything ? (
        <Empty description={t('Nothing on your plate — nice!')} />
      ) : view === 'matrix' ? (
        renderMatrix()
      ) : view === 'days' ? (
        renderDays()
      ) : (
        <div className={`mywork__cols${isOn('dayplan') ? '' : ' mywork__cols--norail'}`}>
          <div className="mywork__main">
            {order.map((key) => {
              const content = renderBlock(key);
              if (!content) return null;
              return (
                <div
                  key={key}
                  className={`mywork__sortable${dragKey === key ? ' mywork__sortable--dragging' : ''}`}
                  onDragOver={(event) => { if (dragKey) event.preventDefault(); }}
                  onDrop={() => { if (dragKey && dragKey !== key) moveBefore(dragKey, key); }}
                >
                  <span
                    className="mywork__grip"
                    draggable
                    role="button"
                    aria-label={t('Drag to reorder')}
                    title={t('Drag to reorder')}
                    onDragStart={() => setDragKey(key)}
                    onDragEnd={() => setDragKey(null)}
                  >
                    <HolderOutlined />
                  </span>
                  {content}
                </div>
              );
            })}
          </div>
          {isOn('dayplan') ? renderDayPlan() : null}
        </div>
      )}

      <AdminModal
        title={t('Task')}
        saveForm="task-create-form"
        open={modalOpen}
        onCancel={closeEditor}
        destroyOnHidden
        width={920}
      >
        <TaskCreateForm onClose={closeEditor} taskToEdit={editingTask} />
      </AdminModal>

      <AdminModal
        title={t('Plan the day')}
        open={planOpen}
        onCancel={() => setPlanOpen(false)}
        onSave={confirmPlan}
        saveText={planSelected.size ? `${t('Plan it')} ${planSelected.size}` : t('Plan it')}
        saveDisabled={!planSelected.size}
        saveLoading={planning}
        width={620}
        destroyOnHidden
      >
        <div className="mywork__plan">
          <p className="mywork__plan-sub">{t('Pick what you want to get done today')}</p>
          {planCandidates.length ? planCandidates.map((task) => {
            const on = planSelected.has(task._id);
            const due = dueLabel(task);
            return (
              <button
                type="button"
                key={task._id}
                className={`mywork__plan-row${on ? ' is-on' : ''}`}
                onClick={() => togglePlan(task._id)}
              >
                <span className={`mywork__plan-check${on ? ' is-on' : ''}`}>{on ? <CheckOutlined /> : null}</span>
                <span className="mywork__plan-title">{task.taskTitle}</span>
                {due ? <span className={`mytasks__due mytasks__due--${due.tone}`}>{due.text}</span> : null}
              </button>
            );
          }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Nothing to plan')} />}
        </div>
      </AdminModal>

      <AdminModal
        title={t('End the day')}
        open={reviewOpen}
        onCancel={() => setReviewOpen(false)}
        onSave={confirmReview}
        saveText={reviewSelected.size ? `${t('Move to tomorrow')} (${reviewSelected.size})` : t('Done')}
        saveLoading={reviewing}
        width={620}
        destroyOnHidden
      >
        <div className="mywork__plan">
          <div className="mywork__review-stat">
            🎉 {t('You completed {n} today').replace('{n}', String(doneTodayCount))}
          </div>
          {reviewCandidates.length ? (
            <>
              <p className="mywork__plan-sub">{t('Move what you didn’t finish to tomorrow')}</p>
              {reviewCandidates.map((task) => {
                const on = reviewSelected.has(task._id);
                const due = dueLabel(task);
                return (
                  <button
                    type="button"
                    key={task._id}
                    className={`mywork__plan-row${on ? ' is-on' : ''}`}
                    onClick={() => setReviewSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(task._id)) next.delete(task._id); else next.add(task._id);
                      return next;
                    })}
                  >
                    <span className={`mywork__plan-check${on ? ' is-on' : ''}`}>{on ? <CheckOutlined /> : null}</span>
                    <span className="mywork__plan-title">{task.taskTitle}</span>
                    {due ? <span className={`mytasks__due mytasks__due--${due.tone}`}>{due.text}</span> : null}
                  </button>
                );
              })}
            </>
          ) : <p className="mywork__plan-sub">{t('All clear — nothing left for today.')}</p>}
        </div>
      </AdminModal>
    </div>
  );
}
