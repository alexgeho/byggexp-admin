// The company dashboard is assembled from these blocks. Each can be shown or
// hidden per user via the "Customize" control (see useDashboardLayout). The
// hero and the customize button itself are always shown.
export const DASHBOARD_BLOCKS = [
  { key: 'stats', title: 'Key figures' },
  { key: 'economy', title: 'Economy' },
  { key: 'personnel', title: 'Personnel overview' },
  { key: 'deadlines', title: 'Upcoming deadlines' },
  { key: 'payments', title: 'Payments due' },
  { key: 'projects', title: 'Project overview' },
  { key: 'activity', title: 'Recent activity' },
];

export const DASHBOARD_BLOCK_KEYS = DASHBOARD_BLOCKS.map((block) => block.key);
