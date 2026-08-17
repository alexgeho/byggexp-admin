// Constants and pure helpers for the project overview tab.

// Personal project-overview layout (hidden blocks + order) — same shared hook as
// the dashboard, just a different block set and storage key.
export const OVERVIEW_LAYOUT_STORAGE_KEY = 'byggexp.projectOverview.layout.v1';

export const MS_PER_HOUR = 3600000;

export const formatHours = (durationMs = 0) => {
  const hours = Math.round((durationMs / MS_PER_HOUR) * 10) / 10;
  return `${hours || 0}h`;
};

export const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getUsagePercent = (spent, planned) => {
  if (!planned || planned <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((spent / planned) * 100));
};

export const isCompletedTask = (task) => task?.status === 'completed';

export const isOverdueTask = (task, now) => !isCompletedTask(task)
  && task?.dueDate && new Date(task.dueDate).getTime() < now;
