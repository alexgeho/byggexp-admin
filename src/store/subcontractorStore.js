import { create } from 'zustand';
import apiClient from '@/src/api/apiClient';
import { getEntityId } from '@/src/utils/entityId';

// Subcontractor firms (underentreprenörer) of the company. A subcontractor's
// contact person gets only its own firm back (with `clientCompanyName`).
export const useSubcontractorStore = create((set, get) => ({
  subcontractors: [],
  loaded: false,

  // Quiet by design: the list only feeds filters and labels, so a failed load
  // just leaves them out.
  fetchAll: async () => {
    try {
      const res = await apiClient.get('/subcontractors');
      const list = Array.isArray(res.data) ? res.data : [];
      set({ subcontractors: list, loaded: true });
      return list;
    } catch {
      set({ subcontractors: [], loaded: true });
      return [];
    }
  },

  create: async (payload) => {
    const res = await apiClient.post('/subcontractors', payload);
    await get().fetchAll();
    return res.data;
  },

  nameOf: (id) => {
    if (!id) return '';
    const firm = get().subcontractors.find((item) => String(getEntityId(item)) === String(id));
    return firm?.name || '';
  },
}));
