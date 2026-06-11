import { create } from 'zustand';
import { message } from 'antd';
import apiClient from '../api/apiClient';
import { sortByNewest } from '../utils/sortByNewest';
import { matchesEntityId } from '../utils/entityId';

export const useToolStore = create((set, get) => ({
  tools: [],
  loading: false,
  error: null,

  fetchAllAccessible: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/tools');
      set({ tools: sortByNewest(res.data), loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load instruments';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  create: async (data) => {
    set({ loading: true, error: null });
    try {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const res = await apiClient.post('/tools', data, isFormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined);
      message.success('Instrument created');
      await get().fetchAllAccessible();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create instrument';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  update: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const res = await apiClient.put(`/tools/${id}`, data, isFormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined);
      message.success('Instrument updated');
      set((state) => ({
        tools: sortByNewest(state.tools.map((tool) => (matchesEntityId(tool, id) ? res.data : tool))),
        loading: false,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update instrument';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/tools/${id}`);
      message.success('Instrument deleted');
      set((state) => ({
        tools: state.tools.filter((tool) => !matchesEntityId(tool, id)),
        loading: false,
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete instrument';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  attachToWorker: async (workerId, toolIds) => {
    if (!toolIds?.length) {
      return;
    }

    await apiClient.post('/tools/attach-to-worker', { workerId, toolIds });
  },

  attachToProject: async (projectId, toolIds) => {
    if (!toolIds?.length) {
      return;
    }

    await apiClient.post('/tools/attach-to-project', { projectId, toolIds });
  },
}));
