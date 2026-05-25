export const PROJECT_STATUS_COLORS = {
  planning: '#D4D933',
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

export function getProjectStatusColor(status) {
  return PROJECT_STATUS_COLORS[status] || 'default';
}

export function getProjectStatusLabel(status) {
  return PROJECT_STATUS_LABELS[status] || status || '-';
}
