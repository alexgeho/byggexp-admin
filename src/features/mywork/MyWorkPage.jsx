'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Empty, Segmented, Spin, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, FlagFilled, PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import AdminModal from '@/src/shared/components/AdminModal';
import TaskCreateForm from '@/src/features/tasks/components/TaskCreateForm';
import { useTaskStore } from '@/src/store/taskStore';
import { useApprovalsStore } from '@/src/store/approvalsStore';
import { useAuthStore } from '@/src/store/authStore';
import { useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { useT } from '@/src/i18n/LanguageProvider';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { getEntityId } from '@/src/utils/entityId';
import { formatSek } from '@/src/utils/formatCurrency';
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

// "Mitt arbete" — one Today-first surface that merges the approvals inbox
// (Att göra) with personal tasks (Mina uppgifter), grouped by time horizon so
// what needs attention today rises to the top.
export default function MyWorkPage() {
  const t = useT();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const myId = user?.id || user?._id || user?.userId;
  const { tasks, loading, fetchAllAccessible, complete, reopen } = useTaskStore();
  const {
    expenses, supplier, leave, certificates, fetchAll: fetchApprovals,
    approveExpense, rejectExpense, approveSupplier, approveLeave, rejectLeave,
  } = useApprovalsStore();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('normal');
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [now] = useState(() => Date.now());
  const inputRef = useRef(null);

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

  const mine = useMemo(
    () => tasks.filter((task) => idOf(task.assigneeUserId) === myId),
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
    const due = result.dueMs != null ? new Date(result.dueMs) : new Date(nowMs + 7 * DAY);
    const finalPriority = result.priority === 'high' ? 'high' : priority;
    try {
      await apiClient.post('/tasks', {
        taskTitle: text,
        status: 'open',
        priority: finalPriority,
        startDate: new Date(nowMs).toISOString(),
        dueDate: due.toISOString(),
        assigneeUserId: myId,
      });
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

  const renderRow = (task) => {
    const due = dueLabel(task);
    const project = nameOf(task.projectId);
    const isDone = task.status === 'completed';
    const prio = task.priority || 'normal';
    return (
      <div key={task._id} className={`mytasks__row mytasks__row--${prio}${isDone ? ' mytasks__row--done' : ''}`}>
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
      ) : (
        <>
          {taskSection('overdue', t('Overdue'), groups.overdue, 'over')}
          {taskSection('today', t('Today'), groups.today, 'today')}

          {approvalsCount ? (
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
          ) : null}

          {taskSection('upcoming', t('Upcoming'), groups.upcoming, 'todo')}
          {taskSection('someday', t('Someday'), groups.someday, 'todo')}

          {groups.done.length ? (
            <div className="mytasks__group">
              <div className="mytasks__group-head mytasks__group-head--done">
                {t('Done')}<span className="mytasks__count">{groups.done.length}</span>
              </div>
              <div className="mytasks__list">{groups.done.map(renderRow)}</div>
            </div>
          ) : null}
        </>
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
    </div>
  );
}
