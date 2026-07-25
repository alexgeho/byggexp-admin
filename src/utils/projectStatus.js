export const PROJECT_STATUS_COLORS = {
  planning: '#2582D9', // blue — scheduled, not started yet
  in_progress: '#25D937', // green — actively running
  completed: '#64748B', // slate grey — done, visually de-emphasized
  on_hold: '#F5A623', // amber — paused, needs attention
};

export const PROJECT_STATUS_LABELS = {
  planning: 'Planning',
  in_progress: 'In progress',
  completed: 'Completed',
  on_hold: 'On hold',
};

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function getProjectStatusColor(status) {
  return PROJECT_STATUS_COLORS[status] || 'default';
}

export function getProjectStatusLabel(status) {
  return PROJECT_STATUS_LABELS[status] || status || '-';
}
