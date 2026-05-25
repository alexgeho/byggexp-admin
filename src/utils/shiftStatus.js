export const SHIFT_STATUS_COLORS = {
  active: 'green',
  paused: 'gold',
  completed: 'blue',
};

export const SHIFT_STATUS_LABELS = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
};

export function getShiftStatusColor(status) {
  return SHIFT_STATUS_COLORS[status] || 'default';
}

export function getShiftStatusLabel(status) {
  return SHIFT_STATUS_LABELS[status] || status || '-';
}
