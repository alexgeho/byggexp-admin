import { useBlockLayout } from '@/src/shared/components/blocks/useBlockLayout';
import { DASHBOARD_BLOCK_KEYS } from '@/src/features/dashboard/dashboardBlocks';

// Personal dashboard layout (hidden blocks + order), persisted per-user in
// localStorage. Thin wrapper over the shared useBlockLayout so the dashboard
// and the project Overview tab share one implementation. Bump the storage-key
// suffix if the block set changes shape in a way that shouldn't inherit old
// preferences.
const STORAGE_KEY = 'byggexp.dashboard.layout.v2';

export function useDashboardLayout() {
  return useBlockLayout({ blockKeys: DASHBOARD_BLOCK_KEYS, storageKey: STORAGE_KEY });
}
