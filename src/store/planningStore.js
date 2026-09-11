import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { matchesEntityId } from '@/src/utils/entityId';

// Manual upcoming cash-flow entries for the financial-planning page (items not
// tied to an invoice). Invoice-derived rows come from the invoice/supplier
// stores; these are the ones the user adds and deletes by hand.
export const usePlanningStore = create((set, get) => ({
  entries: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true });
    try {
      const { data } = await apiClient.get('/planning-entries');
      set({ entries: Array.isArray(data) ? data : [], loading: false });
      return data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to load planning entries');
      set({ entries: [], loading: false });
      return [];
    }
  },

  create: async (payload) => {
    try {
      const { data } = await apiClient.post('/planning-entries', payload);
      appMessage.success('Added');
      await get().fetchAll();
      return data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Could not add the entry');
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await apiClient.delete(`/planning-entries/${id}`);
      set((state) => ({ entries: state.entries.filter((e) => !matchesEntityId(e, id)) }));
      appMessage.success('Deleted');
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Could not delete the entry');
      throw err;
    }
  },
}));
