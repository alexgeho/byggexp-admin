// The financial-planning page is assembled from these movable/hideable blocks
// (shared BlockGrid + useBlockLayout), like the dashboard. `size` drives the
// column span: 'full' = whole row, 'half' = two per row on wide screens.
export const PLANNING_BLOCKS = [
  { key: 'kpis', title: 'Key figures', size: 'full' },
  { key: 'intake', title: 'Reminders & scan', size: 'full' },
  { key: 'liquidity', title: 'Liquidity forecast', size: 'full' },
  { key: 'payables', title: 'Upcoming payments', size: 'half' },
  { key: 'receivables', title: 'Upcoming receipts', size: 'half' },
];

export const PLANNING_BLOCK_KEYS = PLANNING_BLOCKS.map((b) => b.key);

export const PLANNING_BLOCK_MAP = Object.fromEntries(
  PLANNING_BLOCKS.map((b) => [b.key, b]),
);
