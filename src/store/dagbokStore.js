import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { matchesEntityId } from '@/src/utils/entityId';

// Dagbok — construction site diary entries (per project, per day).
export const useDagbokStore = create((set) => ({
  entries: [],
  loading: false,

  fetchAll: async (projectId) => {
    set({ loading: true });
    try {
      const res = await apiClient.get('/dagbok', {
        params: projectId ? { projectId } : {},
      });
      set({ entries: res.data || [], loading: false });
      return res.data || [];
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to load diary');
      set({ loading: false });
      return [];
    }
  },

  create: async (payload) => {
    try {
      const res = await apiClient.post('/dagbok', payload);
      appMessage.success('Diary entry saved');
      set((state) => ({ entries: [res.data, ...state.entries] }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save diary entry');
      throw err;
    }
  },

  update: async (id, payload) => {
    try {
      const res = await apiClient.put(`/dagbok/${id}`, payload);
      appMessage.success('Diary entry saved');
      set((state) => ({
        entries: state.entries.map((e) => (matchesEntityId(e, id) ? res.data : e)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save diary entry');
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await apiClient.delete(`/dagbok/${id}`);
      appMessage.success('Diary entry deleted');
      set((state) => ({ entries: state.entries.filter((e) => !matchesEntityId(e, id)) }));
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to delete diary entry');
      throw err;
    }
  },
}));
