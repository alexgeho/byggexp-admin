'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, Empty, Modal, Popover, Segmented, Spin } from 'antd';
import { BellOutlined, HolderOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { Button as UiButton, IconButton, LinkButton } from '@/src/ui-kit';
import ManagerRemindersCard from '@/src/features/profile/ManagerRemindersCard';
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
import TaskRow from '@/src/features/mywork/components/TaskRow';
import ApprovalRow from '@/src/features/mywork/components/ApprovalRow';
import { PlanDayModal, ReviewDayModal } from '@/src/features/mywork/components/PlanReviewModals';
import {
  idOf, nameOf, DAY, dateKeyOf, PRIORITY_RANK, APPROVALS_INLINE_LIMIT,
  QUADRANTS, PLAN_HOURS, DAY_COLUMNS, DOW, groupTasks, buildMatrix, getDueLabel,
} from '@/src/features/mywork/myWorkUtils';
import '@/src/features/tasks/MyTasksPage.scss';
import './MyWorkPage.scss';

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
  const [reminderOpenId, setReminderOpenId] = useState(null); // task row whose reminder popover is open
  const economy = useEconomyData();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('normal');
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const isManager = useAuthStore((state) => state.isCompanyAdmin() || state.isSuperAdmin());
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

  const groups = useMemo(() => groupTasks(mine, now), [mine, now]);

  // Eisenhower matrix: important = high priority, urgent = due today or earlier.
  const matrix = useMemo(() => buildMatrix(mine, now), [mine, now]);

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

  const dueLabel = (task) => getDueLabel(task, now, t);

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

  // Set/clear a reminder straight from a task row. The reminder time becomes the
  // task's dueDate; `allMembersNotification` routes the push to the personal-task
  // owner. interval 0 = a single ping at that time (autoReminder one-shot),
  // interval > 0 = re-nag every N minutes until the task is completed.
  const writeTaskReminder = async (task, { dueIso, remindOn, intervalMinutes }) => {
    const existing = task.notificationSettings || {};
    const payload = {
      ...taskPayloadWithDue(task, dueIso),
      notificationSettings: {
        ...existing,
        assignees: existing.assignees || [],
        allMembersNotification: true,
        autoReminder: remindOn,
        customReminder: existing.customReminder || false,
        customMessage: existing.customMessage || '',
        repeat: intervalMinutes > 0 ? 'minutes' : 'none',
        repeatIntervalMinutes: intervalMinutes > 0 ? intervalMinutes : (Number(existing.repeatIntervalMinutes) || 15),
        remindUntilDone: intervalMinutes > 0,
        maxReminders: Number(existing.maxReminders) || 0,
        escalateToBoss: false,
        escalateToUserIds: [],
      },
    };
    await apiClient.put(`/tasks/${task._id}`, payload);
    await fetchAllAccessible();
  };

  const saveTaskReminder = async (task, { dueIso, intervalMinutes }) => {
    try {
      await writeTaskReminder(task, { dueIso, remindOn: true, intervalMinutes });
      appMessage.success(t('Reminder set'));
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not set reminder'));
      throw err;
    }
  };

  // Completing a recurring task spawns its next occurrence server-side; refetch
  // so the freshly created follow-up shows up straight away.
  const completeTask = async (task) => {
    await complete(task._id);
    if (task.recurrence && task.recurrence !== 'none') {
      fetchAllAccessible();
    }
  };

  const clearTaskReminder = async (task) => {
    try {
      // Keep the due date, just switch the reminder off.
      await writeTaskReminder(task, { dueIso: task.dueDate, remindOn: false, intervalMinutes: 0 });
      appMessage.success(t('Reminder cleared'));
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not set reminder'));
      throw err;
    }
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
        <LinkButton onClick={reset}>
          {t('Reset layout')}
        </LinkButton>
      ) : null}
    </div>
  );

  // --- "Days" board view (Todoist-style day columns) ---
  const addForDay = async (dateObj) => {
    const key = dateKeyOf(dateObj);
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
              <LinkButton onClick={rescheduleOverdue}>{t('Reschedule')}</LinkButton>
            ) : null}
          </div>
          <div className="mywork__daycol-body">
            {groups.overdue.length ? groups.overdue.map(renderDraggableTask) : <div className="mywork__daycol-empty">—</div>}
          </div>
        </div>
        {columns.map((d, i) => {
          const key = dateKeyOf(d);
          const items = openMine
            .filter((task) => task.dueDate && dateKeyOf(task.dueDate) === key)
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

  const renderRow = (task) => (
    <TaskRow
      key={task._id}
      task={task}
      now={now}
      reminderOpenId={reminderOpenId}
      setReminderOpenId={setReminderOpenId}
      planDragId={planDragId}
      setPlanDragId={setPlanDragId}
      setPlanDragOverHour={setPlanDragOverHour}
      onOpen={openEditor}
      onComplete={completeTask}
      onReopen={reopen}
      onRemove={remove}
      onSaveReminder={saveTaskReminder}
      onClearReminder={clearTaskReminder}
    />
  );

  const taskSection = (key, label, items, tone) => items.length ? (
    <div className="mytasks__group" key={key}>
      <div className={`mytasks__group-head mytasks__group-head--${tone}`}>
        {label}<span className="mytasks__count">{items.length}</span>
      </div>
      <div className="mytasks__list">{items.map(renderRow)}</div>
    </div>
  ) : null;

  // An unpaid supplier invoice past its due date — surfaced in the Overdue
  // section next to overdue tasks, so all overdue lives in one place.
  const isOverduePayment = (inv) => inv.status !== 'paid'
    && inv.dueDate && new Date(inv.dueDate).getTime() < economy.now;
  const overduePayments = isOn('payments')
    ? (economy.data?.supplier || []).filter(isOverduePayment)
    : [];

  const renderOverduePaymentRow = (inv) => (
    <div
      key={`pay-${inv._id || inv.id}`}
      className="mytasks__row mytasks__row--overdue mywork__payrow"
      role="button"
      tabIndex={0}
      onClick={() => router.push('/company/invoicing/supplier-invoices')}
      onKeyDown={(e) => { if (e.key === 'Enter') router.push('/company/invoicing/supplier-invoices'); }}
    >
      <span className="mywork__payrow-ic" aria-hidden="true">💳</span>
      <div className="mywork__payrow-body">
        <span className="mytasks__title">{inv.supplierName || t('Supplier')}</span>
        <span className="mytasks__meta">
          <span className="mytasks__due mytasks__due--over">{t('Overdue')}</span>
          <span className="mytasks__project">{new Date(inv.dueDate).toLocaleDateString('sv-SE')}</span>
        </span>
      </div>
      <span className="mywork__payrow-amount">{formatSek(inv.total, { decimals: false })}</span>
    </div>
  );

  const renderOverdueBlock = () => {
    const total = groups.overdue.length + overduePayments.length;
    if (!total) return null;
    return (
      <div className="mytasks__group" key="overdue">
        <div className="mytasks__group-head mytasks__group-head--over">
          {t('Overdue')}<span className="mytasks__count">{total}</span>
        </div>
        <div className="mytasks__list">
          {groups.overdue.map(renderRow)}
          {overduePayments.map(renderOverduePaymentRow)}
        </div>
      </div>
    );
  };

  const approveRow = (row) => {
    if (row.type === 'expense') approveExpense(row.id);
    else if (row.type === 'supplier') approveSupplier(row.id);
    else approveLeave(row.id);
  };
  const rejectRow = (row) => (row.type === 'expense' ? rejectExpense(row.id) : rejectLeave(row.id));
  const viewRow = (row) => router.push(`/company/users/${row.id}`);

  const renderApprovalRow = (row) => (
    <ApprovalRow
      key={row.key}
      row={row}
      onApprove={approveRow}
      onReject={rejectRow}
      onView={viewRow}
    />
  );

  // Each main-column block by key, so the list can be rendered (and dragged) in
  // the user's saved order. Returns null when a block is hidden or empty.
  const renderBlock = (key) => {
    switch (key) {
      case 'overdue':
        return renderOverdueBlock();
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
        // Overdue invoices are shown in the Overdue block above; keep only the
        // still-upcoming ones here so nothing is listed twice.
        return isOn('payments') ? (
          <PaymentsDueBlock
            {...economy}
            data={{ ...economy.data, supplier: (economy.data?.supplier || []).filter((inv) => !isOverduePayment(inv)) }}
            costsLink="/company/invoicing/supplier-invoices"
          />
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

  // Blocks that still render an empty-state placeholder (payments, deadlines)
  // sink to the bottom when they have nothing, so an empty card doesn't wedge
  // itself between the task groups.
  const hasUpcomingPayment = (economy.data?.supplier || []).some(
    (inv) => inv.status !== 'paid' && inv.dueDate && !isOverduePayment(inv),
  );
  const blockIsEmpty = (key) => {
    if (key === 'payments') return !hasUpcomingPayment;
    if (key === 'deadlines') return deadlines.length === 0;
    return false;
  };
  const effectiveOrder = [...order].sort(
    (a, b) => (blockIsEmpty(a) ? 1 : 0) - (blockIsEmpty(b) ? 1 : 0),
  );

  return (
    <div className="mywork">
      <div className="mywork__head">
        <div>
          <h1 className="mywork__greeting">{greeting}{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋</h1>
          <div className="mywork__date">{dateLabel}</div>
          <div className="mywork__chips">
            {(groups.overdue.length + overduePayments.length) ? <span className="mywork__chip mywork__chip--red">{groups.overdue.length + overduePayments.length} {t('overdue')}</span> : null}
            {groups.today.length ? <span className="mywork__chip mywork__chip--blue">{groups.today.length} {t('due today')}</span> : null}
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
          <UiButton onClick={openPlan}>✦ {t('Plan the day')}</UiButton>
          <UiButton variant="secondary" onClick={openReview}>🌙 {t('End the day')}</UiButton>
          {isManager ? (
            <IconButton
              variant="ghost"
              aria-label={t('Reminders')}
              title={t('Reminders')}
              onClick={() => setRemindersOpen(true)}
            >
              <BellOutlined />
            </IconButton>
          ) : null}
          <Popover content={customizeContent} title={t('Customize')} trigger="click" placement="bottomRight">
            <IconButton variant="ghost" aria-label={t('Customize')}>
              <SettingOutlined />
            </IconButton>
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
            {effectiveOrder.map((key) => {
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

      <PlanDayModal
        open={planOpen}
        onCancel={() => setPlanOpen(false)}
        onSave={confirmPlan}
        candidates={planCandidates}
        selected={planSelected}
        onToggle={togglePlan}
        saving={planning}
        dueLabel={dueLabel}
      />

      <ReviewDayModal
        open={reviewOpen}
        onCancel={() => setReviewOpen(false)}
        onSave={confirmReview}
        candidates={reviewCandidates}
        selected={reviewSelected}
        onToggle={(id) => setReviewSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id); else next.add(id);
          return next;
        })}
        saving={reviewing}
        doneTodayCount={doneTodayCount}
        dueLabel={dueLabel}
      />

      <Modal
        title={t('Reminders')}
        open={remindersOpen}
        onCancel={() => setRemindersOpen(false)}
        footer={null}
        width={560}
        destroyOnHidden
      >
        <ManagerRemindersCard bare />
      </Modal>
    </div>
  );
}
