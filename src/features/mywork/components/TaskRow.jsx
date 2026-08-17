import { Popconfirm, Popover, Tooltip } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined, FlagFilled, RetweetOutlined } from '@ant-design/icons';
import { useT } from '@/src/i18n/LanguageProvider';
import { getDueLabel, nameOf, taskHasReminder } from '@/src/features/mywork/myWorkUtils';
import TaskReminderForm from '@/src/features/mywork/components/TaskReminderForm';

// A single task row, reused across the List, Prioritize (matrix) and Days views.
// All mutations are delegated to the page via callbacks; drag/reminder open
// state is lifted so the day-plan rail and the open popover stay in sync.
export default function TaskRow({
  task,
  now,
  reminderOpenId,
  setReminderOpenId,
  planDragId,
  setPlanDragId,
  setPlanDragOverHour,
  onOpen,
  onComplete,
  onReopen,
  onRemove,
  onSaveReminder,
  onClearReminder,
}) {
  const t = useT();
  const due = getDueLabel(task, now, t);
  const project = nameOf(task.projectId);
  const isDone = task.status === 'completed';
  const isOverdue = !isDone && due?.tone === 'over';
  const isDueToday = !isDone && due?.tone === 'today';
  const prio = task.priority || 'normal';
  return (
    <div
      className={`mytasks__row mytasks__row--${prio}${isDone ? ' mytasks__row--done' : ''}${isOverdue ? ' mytasks__row--overdue' : ''}${isDueToday ? ' mytasks__row--today' : ''}${planDragId === task._id ? ' mytasks__row--dragging' : ''}`}
      draggable={!isDone}
      onDragStart={(e) => { setPlanDragId(task._id); e.dataTransfer.effectAllowed = 'move'; }}
      onDragEnd={() => { setPlanDragId(null); setPlanDragOverHour(null); }}
    >
      <Tooltip title={isDone ? t('Reopen') : t('Mark done')}>
        <button
          type="button"
          className={`mytasks__check${isDone ? ' mytasks__check--on' : ''}`}
          aria-label={isDone ? t('Reopen') : t('Mark done')}
          onClick={(e) => { e.stopPropagation(); (isDone ? onReopen(task._id) : onComplete(task)); }}
        >
          {isDone ? <CheckOutlined /> : null}
        </button>
      </Tooltip>
      <button type="button" className="mytasks__body" onClick={() => onOpen(task)}>
        <span className="mytasks__title">
          {prio !== 'normal' && !isDone ? <FlagFilled className={`mytasks__flag mytasks__flag--${prio}`} /> : null}
          {task.taskTitle}
        </span>
        <span className="mytasks__meta">
          {project ? <span className="mytasks__project">{project}</span> : <span className="mytasks__project mytasks__project--personal">{t('Personal')}</span>}
          {due && !isDone ? <span className={`mytasks__due mytasks__due--${due.tone}`}>{due.text}</span> : null}
          {task.recurrence && task.recurrence !== 'none' ? (
            <span className="mytasks__repeat" title={t('Repeats')}><RetweetOutlined /></span>
          ) : null}
        </span>
      </button>
      {!isDone ? (
        <Popover
          trigger="click"
          placement="bottomRight"
          destroyTooltipOnHide
          content={(
            <TaskReminderForm
              task={task}
              onSave={(opts) => onSaveReminder(task, opts)}
              onClear={() => onClearReminder(task)}
              onClose={() => setReminderOpenId(null)}
            />
          )}
          open={reminderOpenId === task._id}
          onOpenChange={(open) => setReminderOpenId(open ? task._id : null)}
        >
          <button
            type="button"
            className={`mytasks__remind-btn${taskHasReminder(task) ? ' mytasks__remind-btn--on' : ''}`}
            aria-label={t('Reminder')}
            title={t('Reminder')}
            onClick={(e) => e.stopPropagation()}
          >
            <BellOutlined />
          </button>
        </Popover>
      ) : null}
      <Popconfirm
        title={t('Delete this task?')}
        okText={t('Delete')}
        cancelText={t('Cancel')}
        okButtonProps={{ danger: true }}
        onConfirm={() => onRemove(task._id)}
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
}
