// antd preset names (not raw hex) so project status tags render as the same
// semantic pills as every other badge; the shared tokens recolour the presets
// in _tags.scss. Intent preserved: planning=blue, in_progress=green,
// completed=grey (de-emphasised), on_hold=amber.
export const PROJECT_STATUS_COLORS = {
  planning: 'processing',
  in_progress: 'success',
  completed: 'default',
  on_hold: 'warning',
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
