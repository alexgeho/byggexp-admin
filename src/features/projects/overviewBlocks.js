// The project overview is assembled from these movable blocks. The info card
// and the stats strip at the top are fixed; everything below can be reordered
// or hidden per user via the "Customize" control (see useOverviewLayout).
export const OVERVIEW_BLOCKS = [
  { key: 'resources', title: 'Budget & resources', size: 'half' },
  { key: 'progress', title: 'Progress', size: 'half' },
  { key: 'tasks', title: 'Tasks', size: 'half' },
  { key: 'shifts', title: 'Shifts', size: 'half' },
  { key: 'photos', title: 'Recent photos', size: 'third' },
  { key: 'documents', title: 'Documents', size: 'third' },
  { key: 'team', title: 'Team', size: 'third' },
];

export const OVERVIEW_BLOCK_KEYS = OVERVIEW_BLOCKS.map((block) => block.key);

export const OVERVIEW_BLOCK_MAP = Object.fromEntries(
  OVERVIEW_BLOCKS.map((block) => [block.key, block]),
);
