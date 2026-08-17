// Colours now live in the single source of truth (src/shared/statusRegistry.js)
// and render through the shared <StatusTag>; this file only keeps the project
// status labels/options used to build filter controls.
const PROJECT_STATUS_LABELS = {
  planning: 'Planning',
  in_progress: 'In progress',
  completed: 'Completed',
  on_hold: 'On hold',
};

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function getProjectStatusLabel(status) {
  return PROJECT_STATUS_LABELS[status] || status || '-';
}
