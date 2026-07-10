export const PROJECT_STATUS_COLORS = {
  planning: '#25D937',
  in_progress: '#2582D9',
  completed: '#25D937',
  on_hold: '#252ED9',
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
