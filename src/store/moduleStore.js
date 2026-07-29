import { create } from 'zustand';
import apiClient from '@/src/api/apiClient';

// Effective module visibility for the current company. `enabled === null` means
// "not loaded / no restriction" (superadmin, or before the fetch resolves) and
// everything shows — the sidebar and guard fail open so a hiccup never locks a
// user out of their own panel.
export const useModuleStore = create((set, get) => ({
  enabled: null,
  plan: null,
  loadedFor: null,
  loading: false,

  fetchForCompany: async (companyId) => {
    if (!companyId) return;
    const { loadedFor, loading } = get();
    if (loadedFor === companyId || loading) return;
    set({ loading: true });
    try {
      const { data } = await apiClient.get(`/company/${companyId}/modules`);
      set({
        enabled: Array.isArray(data?.enabled) ? data.enabled : null,
        plan: data?.plan ?? null,
        loadedFor: companyId,
        loading: false,
      });
    } catch {
      set({ enabled: null, loading: false }); // fail open
    }
  },

  reset: () => set({ enabled: null, plan: null, loadedFor: null, loading: false }),
}));

export const isModuleEnabled = (enabled, key) => !enabled || enabled.includes(key);
