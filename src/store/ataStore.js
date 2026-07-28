import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { matchesEntityId } from '@/src/utils/entityId';

// ÄTA = Ändrings-, Tilläggs- och Avgående arbeten (change orders on top of the
// contracted scope). Scoped per project.
export const useAtaStore = create((set, get) => ({
  items: [],
  loading: false,

  fetchByProject: async (projectId) => {
    if (!projectId) return [];
    set({ loading: true });
    try {
      const res = await apiClient.get('/ata', { params: { projectId } });
      set({ items: res.data || [], loading: false });
      return res.data || [];
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to load ÄTA');
      set({ loading: false });
      return [];
    }
  },

  create: async (payload) => {
    try {
      const res = await apiClient.post('/ata', payload);
      appMessage.success('ÄTA saved');
      await get().fetchByProject(payload.projectId);
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save ÄTA');
      throw err;
    }
  },

  update: async (id, payload, projectId) => {
    try {
      const res = await apiClient.put(`/ata/${id}`, payload);
      appMessage.success('ÄTA saved');
      await get().fetchByProject(projectId);
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save ÄTA');
      throw err;
    }
  },

  setStatus: async (id, status) => {
    try {
      const res = await apiClient.patch(`/ata/${id}/status`, { status });
      appMessage.success('Status updated');
      set((state) => ({
        items: state.items.map((it) => (matchesEntityId(it, id) ? res.data : it)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to update status');
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await apiClient.delete(`/ata/${id}`);
      appMessage.success('ÄTA deleted');
      set((state) => ({ items: state.items.filter((it) => !matchesEntityId(it, id)) }));
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to delete ÄTA');
      throw err;
    }
  },
}));
