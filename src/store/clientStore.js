import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { sortByNewest } from '@/src/utils/sortByNewest';
import { matchesEntityId } from '@/src/utils/entityId';

export const useClientStore = create((set, get) => ({
  clients: [],
  loading: false,
  error: null,

  fetchAllAccessible: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/clients');
      set({ clients: sortByNewest(res.data), loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load clients';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  create: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/clients', data);
      appMessage.success('Client created');
      await get().fetchAllAccessible();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create client';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  update: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.put(`/clients/${id}`, data);
      appMessage.success('Client updated');
      set((state) => ({
        clients: sortByNewest(state.clients.map((client) => (
          matchesEntityId(client, id) ? res.data : client
        ))),
        loading: false,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update client';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/clients/${id}`);
      appMessage.success('Client deleted');
      set((state) => ({
        clients: state.clients.filter((client) => !matchesEntityId(client, id)),
        loading: false,
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete client';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  fetchNextNumber: async (companyId) => {
    const params = companyId ? { companyId } : undefined;
    const res = await apiClient.get('/clients/next-number', { params });
    return res.data?.nextNumber;
  },
}));
