import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { sortByNewest } from '@/src/utils/sortByNewest';
import { matchesEntityId } from '@/src/utils/entityId';

export const usePayrollStore = create((set) => ({
  runs: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/payroll');
      set({ runs: sortByNewest(res.data), loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load payroll runs';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      return [];
    }
  },

  fetchOne: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get(`/payroll/${id}`);
      set({ loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load payroll run';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  create: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/payroll', payload);
      appMessage.success('Payroll run created');
      set((state) => ({ runs: sortByNewest([res.data, ...state.runs]), loading: false }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create payroll run';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  updateStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.patch(`/payroll/${id}/status`, { status });
      appMessage.success('Payroll status updated');
      set((state) => ({
        runs: sortByNewest(state.runs.map((run) => (
          matchesEntityId(run, id) ? res.data : run
        ))),
        loading: false,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update payroll status';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/payroll/${id}`);
      appMessage.success('Payroll run deleted');
      set((state) => ({
        runs: state.runs.filter((run) => !matchesEntityId(run, id)),
        loading: false,
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete payroll run';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },
}));
