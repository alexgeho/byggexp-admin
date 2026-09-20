import { useBlockLayout } from '@/src/shared/components/blocks/useBlockLayout';
import { DASHBOARD_BLOCK_KEYS } from '@/src/features/dashboard/dashboardBlocks';

// Personal dashboard layout (hidden blocks + order), persisted per-user in
// localStorage. Thin wrapper over the shared useBlockLayout so the dashboard
// and the project Overview tab share one implementation. Bump the storage-key
// suffix if the block set changes shape in a way that shouldn't inherit old
// preferences.
// v3: new default order (money-first) + Cashflow/Deadlines hidden by default
// (they duplicate /invoicing/planning and Mitt arbete). Bumped so old v2 prefs
// don't resurrect them.
const STORAGE_KEY = 'byggexp.dashboard.layout.v3';

// Redundant with dedicated screens — available via Customize, off by default.
const DEFAULT_HIDDEN = ['cashflow', 'deadlines'];

export function useDashboardLayout() {
  return useBlockLayout({ blockKeys: DASHBOARD_BLOCK_KEYS, storageKey: STORAGE_KEY, defaultHidden: DEFAULT_HIDDEN });
}
