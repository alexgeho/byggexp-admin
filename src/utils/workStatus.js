export const WORK_STATUS_COLORS = {
  working: 'green',
  off_duty: 'default',
  outside_project_area: 'gold',
};

export const WORK_STATUS_LABELS = {
  working: 'Working',
  off_duty: 'Off duty',
  outside_project_area: 'Outside project area',
};

export function getWorkStatusColor(status) {
  return WORK_STATUS_COLORS[status] || 'default';
}

export function getWorkStatusLabel(status) {
  return WORK_STATUS_LABELS[status] || status || '-';
}
