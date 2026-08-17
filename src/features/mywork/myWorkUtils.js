// Pure helpers, constants and task-bucketing logic for "Mitt arbete" (MyWorkPage).
// Kept framework-free so they can be unit-tested and reused by the page's
// extracted row/form components without pulling in React.

export const idOf = (v) => (v && typeof v === 'object' ? v._id || v.id : v);
export const nameOf = (v) => (v && typeof v === 'object' ? v.name : null);
export const DAY = 86400000;

// <input type="datetime-local"> wants local wall-clock, no timezone suffix.
const pad2 = (n) => String(n).padStart(2, '0');
export const toLocalInput = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

// Repeat cadences offered on the per-task reminder popover. 0 = a single ping
// at the chosen time; the others re-nag every N minutes until the task is done.
export const REMINDER_INTERVALS = [
  { value: 0, label: 'One reminder' },
  { value: 15, label: 'Every 15 min' },
  { value: 30, label: 'Every 30 min' },
  { value: 60, label: 'Every hour' },
];

export const taskHasReminder = (task) => Boolean(task?.dueDate)
  && Boolean(task?.notificationSettings?.remindUntilDone || task?.notificationSettings?.autoReminder);

export const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };
export const APPROVALS_INLINE_LIMIT = 5;

export const APPROVAL_TYPE = {
  expense: { label: 'Expense', tone: 'amber' },
  supplier: { label: 'Purchase invoice', tone: 'blue' },
  leave: { label: 'Leave', tone: 'purple' },
  certificate: { label: 'Certificate', tone: 'red' },
};

// Eisenhower quadrants + the 4D action each implies.
export const QUADRANTS = [
  { key: 'do', label: 'Do now', sub: 'Important & urgent', tone: 'do' },
  { key: 'decide', label: 'Plan it', sub: 'Important, not urgent', tone: 'decide' },
  { key: 'delegate', label: 'Delegate', sub: 'Urgent, not important', tone: 'delegate' },
  { key: 'skip', label: 'Skip', sub: 'Neither', tone: 'skip' },
];

// Working hours shown in the day-plan timeline.
export const PLAN_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

// Day columns shown in the "Days" board view (today + the next N-1 days).
export const DAY_COLUMNS = 6;
export const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const dateKeyOf = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Bucket a person's tasks by time horizon. Overdue is by the exact deadline
// (time included), not just the day — a task due 14:00 today is overdue at 15:00.
export const groupTasks = (mine, now) => {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startMs = startOfToday.getTime();
  const todayEnd = startMs + DAY;
  const nowMs = new Date(now).getTime();

  const overdue = [];
  const today = [];
  const upcoming = [];
  const someday = [];
  const done = [];

  for (const task of mine) {
    if (task.status === 'completed') { done.push(task); continue; }
    const due = task.dueDate ? new Date(task.dueDate).getTime() : null;
    if (due === null) someday.push(task);
    else if (due < nowMs) overdue.push(task);
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
};

// Eisenhower matrix: important = high priority, urgent = due today or earlier.
export const buildMatrix = (mine, now) => {
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
};

// Relative due-date chip for a task row: overdue / today / tomorrow / in N days.
export const getDueLabel = (task, now, t) => {
  if (!task.dueDate) return null;
  const dueMs = new Date(task.dueDate).getTime();
  const day = new Date(task.dueDate);
  day.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / DAY);
  // Past the exact deadline → overdue. Earlier days show "N d overdue";
  // overdue-but-still-today shows a plain "Overdue".
  if (dueMs < new Date(now).getTime()) {
    return diff <= -1
      ? { text: t('{n} d overdue').replace('{n}', String(-diff)), tone: 'over' }
      : { text: t('Overdue'), tone: 'over' };
  }
  if (diff === 0) return { text: t('Today'), tone: 'today' };
  if (diff === 1) return { text: t('Tomorrow'), tone: 'soon' };
  if (diff <= 7) return { text: t('In {n} d').replace('{n}', String(diff)), tone: 'soon' };
  return { text: new Date(task.dueDate).toLocaleDateString(), tone: 'later' };
};
