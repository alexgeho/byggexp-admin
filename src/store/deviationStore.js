import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { matchesEntityId } from '@/src/utils/entityId';

// Avvik / Avvikelser / Deviations (backend: /deviations).
const replaceIn = (list, id, next) => list.map((d) => (matchesEntityId(d, id) ? { ...d, ...next } : d));

export const useDeviationStore = create((set) => ({
  deviations: [],
  loading: false,

  fetchDeviations: async (params = {}) => {
    set({ loading: true });
    try {
      const res = await apiClient.get('/deviations', { params });
      set({ deviations: res.data || [], loading: false });
      return res.data || [];
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to load deviations');
      set({ loading: false });
      return [];
    }
  },

  fetchDeviation: async (id) => {
    const res = await apiClient.get(`/deviations/${id}`);
    set((s) => ({ deviations: replaceIn(s.deviations, id, res.data) }));
    return res.data;
  },

  createDeviation: async (payload) => {
    try {
      const res = await apiClient.post('/deviations', payload);
      appMessage.success('Deviation reported');
      set((s) => ({ deviations: [res.data, ...s.deviations] }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save deviation');
      throw err;
    }
  },

  updateDeviation: async (id, payload) => {
    try {
      const res = await apiClient.put(`/deviations/${id}`, payload);
      set((s) => ({ deviations: replaceIn(s.deviations, id, res.data) }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save deviation');
      throw err;
    }
  },

  closeDeviation: async (id, payload) => {
    try {
      const res = await apiClient.post(`/deviations/${id}/close`, payload);
      appMessage.success('Deviation closed');
      set((s) => ({ deviations: replaceIn(s.deviations, id, res.data) }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to close deviation');
      throw err;
    }
  },

  reopenDeviation: async (id, comment = '') => {
    try {
      const res = await apiClient.post(`/deviations/${id}/reopen`, { comment });
      set((s) => ({ deviations: replaceIn(s.deviations, id, res.data) }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to reopen deviation');
      throw err;
    }
  },

  addPhotos: async (id, files) => {
    const body = new FormData();
    files.forEach((f) => body.append('photos', f));
    try {
      const res = await apiClient.post(`/deviations/${id}/photos`, body, { timeout: 120000 });
      set((s) => ({ deviations: replaceIn(s.deviations, id, res.data) }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to upload photos');
      throw err;
    }
  },

  removeDeviation: async (id) => {
    try {
      await apiClient.delete(`/deviations/${id}`);
      appMessage.success('Deviation deleted');
      set((s) => ({ deviations: s.deviations.filter((d) => !matchesEntityId(d, id)) }));
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to delete deviation');
      throw err;
    }
  },

  responsibleOptions: async (projectId) => {
    if (!projectId) return [];
    try {
      const res = await apiClient.get('/deviations/responsible-options', { params: { projectId } });
      return res.data || [];
    } catch {
      return [];
    }
  },
}));
