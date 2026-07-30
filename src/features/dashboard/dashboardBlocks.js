// The company dashboard is assembled from these blocks. Each can be shown or
// hidden and reordered (drag) per user via useDashboardLayout. `size` drives
// the column span: 'full' = whole row, 'half' = two per row on wide screens.
export const DASHBOARD_BLOCKS = [
  { key: 'stats', title: 'Key figures', size: 'full' },
  { key: 'economy', title: 'Economy', size: 'full' },
  { key: 'payments', title: 'Payments due', size: 'full' },
  { key: 'cashflow', title: 'Cash flow', size: 'full' },
  { key: 'personnel', title: 'Personnel overview', size: 'half' },
  { key: 'deadlines', title: 'Upcoming deadlines', size: 'half' },
  { key: 'projects', title: 'Project overview', size: 'half' },
  { key: 'activity', title: 'Recent activity', size: 'half' },
];

export const DASHBOARD_BLOCK_KEYS = DASHBOARD_BLOCKS.map((block) => block.key);

export const DASHBOARD_BLOCK_MAP = Object.fromEntries(
  DASHBOARD_BLOCKS.map((block) => [block.key, block]),
);
