'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Empty, Spin, Tooltip } from 'antd';
import { CheckOutlined, PlusOutlined } from '@ant-design/icons';
import AdminModal from '@/src/shared/components/AdminModal';
import TaskCreateForm from '@/src/features/tasks/components/TaskCreateForm';
import { useTaskStore } from '@/src/store/taskStore';
import { useAuthStore } from '@/src/store/authStore';
import { useT } from '@/src/i18n/LanguageProvider';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import './MyTasksPage.scss';

const idOf = (v) => (v && typeof v === 'object' ? v._id || v.id : v);
const nameOf = (v) => (v && typeof v === 'object' ? v.name : null);
const DAY = 86400000;

// A focused personal inbox: only the tasks assigned to me, grouped by
// urgency (overdue / to do / done). Fast to skim, one click to tick off,
// click a row to open the full editor.
export default function MyTasksPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const myId = user?.id || user?._id || user?.userId;
  const { tasks, loading, fetchAllAccessible, complete, reopen } = useTaskStore();

  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [now] = useState(() => Date.now());
  const inputRef = useRef(null);

  useEffect(() => {
    fetchAllAccessible();
  }, [fetchAllAccessible]);

  const mine = useMemo(
    () => tasks.filter((task) => idOf(task.assigneeUserId) === myId),
    [tasks, myId],
  );

  const groups = useMemo(() => {
    const startOfTomorrow = new Date(now);
    startOfTomorrow.setHours(0, 0, 0, 0);
    const todayEnd = startOfTomorrow.getTime() + DAY;
    const overdue = [];
    const todo = [];
    const done = [];
    for (const task of mine) {
      if (task.status === 'completed') {
        done.push(task);
        continue;
      }
      const due = task.dueDate ? new Date(task.dueDate).getTime() : null;
      if (due !== null && due < todayEnd - DAY) overdue.push(task);
      else todo.push(task);
    }
    const byDue = (a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
    overdue.sort(byDue);
    todo.sort(byDue);
    done.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    return { overdue, todo, done: done.slice(0, 20) };
  }, [mine, now]);

  const dueLabel = (task) => {
    if (!task.dueDate) return null;
    const due = new Date(task.dueDate);
    const day = new Date(due);
    day.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((day.getTime() - today.getTime()) / DAY);
    if (diff === 0) return { text: t('Today'), tone: 'today' };
    if (diff === 1) return { text: t('Tomorrow'), tone: 'soon' };
    if (diff < 0) return { text: t('{n} d overdue').replace('{n}', String(-diff)), tone: 'over' };
    if (diff <= 7) return { text: t('In {n} d').replace('{n}', String(diff)), tone: 'soon' };
    return { text: due.toLocaleDateString(), tone: 'later' };
  };

  const quickAdd = async () => {
    const text = title.trim();
    if (!text || saving) return;
    setSaving(true);
    const start = new Date(now);
    const due = new Date(now + 7 * DAY);
    try {
      await apiClient.post('/tasks', {
        taskTitle: text,
        status: 'open',
        startDate: start.toISOString(),
        dueDate: due.toISOString(),
        assigneeUserId: myId,
      });
      setTitle('');
      await fetchAllAccessible();
      setTimeout(() => inputRef.current?.focus(), 10);
    } catch (err) {
      appMessage.error(err.response?.data?.message || t('Could not add task'));
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const closeEditor = () => {
    setModalOpen(false);
    setEditingTask(null);
    fetchAllAccessible();
  };

  const renderRow = (task) => {
    const due = dueLabel(task);
    const project = nameOf(task.projectId);
    const isDone = task.status === 'completed';
    return (
      <div key={task._id} className={`mytasks__row${isDone ? ' mytasks__row--done' : ''}`}>
        <Tooltip title={isDone ? t('Reopen') : t('Mark done')}>
          <button
            type="button"
            className={`mytasks__check${isDone ? ' mytasks__check--on' : ''}`}
            aria-label={isDone ? t('Reopen') : t('Mark done')}
            onClick={(e) => {
              e.stopPropagation();
              (isDone ? reopen : complete)(task._id);
            }}
          >
            {isDone ? <CheckOutlined /> : null}
          </button>
        </Tooltip>
        <button type="button" className="mytasks__body" onClick={() => openEditor(task)}>
          <span className="mytasks__title">{task.taskTitle}</span>
          <span className="mytasks__meta">
            {project ? <span className="mytasks__project">{project}</span> : <span className="mytasks__project mytasks__project--personal">{t('Personal')}</span>}
            {due && !isDone ? <span className={`mytasks__due mytasks__due--${due.tone}`}>{due.text}</span> : null}
          </span>
        </button>
      </div>
    );
  };

  const section = (key, label, items, tone) =>
    items.length ? (
      <div className="mytasks__group">
        <div className={`mytasks__group-head mytasks__group-head--${tone}`}>
          {label}
          <span className="mytasks__count">{items.length}</span>
        </div>
        <div className="mytasks__list">{items.map(renderRow)}</div>
      </div>
    ) : null;

  const empty = !loading && !groups.overdue.length && !groups.todo.length && !groups.done.length;

  return (
    <div className="mytasks">
      <div className="mytasks__add">
        <PlusOutlined className="mytasks__add-icon" />
        <input
          ref={inputRef}
          className="mytasks__add-input"
          value={title}
          placeholder={t('Add a task for yourself…')}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') quickAdd();
          }}
        />
        <button type="button" className="mytasks__add-btn" onClick={quickAdd} disabled={saving || !title.trim()}>
          {t('Add')}
        </button>
      </div>

      {loading && !mine.length ? (
        <div className="mytasks__spin"><Spin /></div>
      ) : empty ? (
        <Empty description={t('No tasks assigned to you')} />
      ) : (
        <>
          {section('overdue', t('Overdue'), groups.overdue, 'over')}
          {section('todo', t('To do'), groups.todo, 'todo')}
          {groups.done.length ? (
            <div className="mytasks__group">
              <div className="mytasks__group-head mytasks__group-head--done">
                {t('Done')}
                <span className="mytasks__count">{groups.done.length}</span>
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
