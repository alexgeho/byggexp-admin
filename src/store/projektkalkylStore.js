import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { sortByNewest } from '@/src/utils/sortByNewest';
import { matchesEntityId } from '@/src/utils/entityId';

export const useProjektkalkylStore = create((set, get) => ({
  kalkyler: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/projektkalkyl');
      set({ kalkyler: sortByNewest(res.data || []), loading: false });
    } catch (err) {
      set({ error: err, loading: false });
    }
  },

  fetchOne: async (id) => {
    const res = await apiClient.get(`/projektkalkyl/${id}`);
    return res.data;
  },

  create: async (data = {}) => {
    try {
      const res = await apiClient.post('/projektkalkyl', data);
      await get().fetchAll();
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Kunde inte skapa kalkylen');
      throw err;
    }
  },

  update: async (id, data) => {
    try {
      const res = await apiClient.put(`/projektkalkyl/${id}`, data);
      set((state) => ({
        kalkyler: sortByNewest(
          state.kalkyler.map((k) => (matchesEntityId(k, id) ? res.data : k)),
        ),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Kunde inte spara kalkylen');
      throw err;
    }
  },

  createShareLink: async (id) => {
    const res = await apiClient.post(`/projektkalkyl/${id}/share`);
    return res.data; // { token, expiresAt }
  },

  revokeShareLink: async (id) => {
    await apiClient.delete(`/projektkalkyl/${id}/share`);
  },

  fetchPublic: async (token) => {
    const res = await apiClient.get(`/projektkalkyl-public/${token}`);
    return res.data; // { name, note, tables, expiresAt }
  },

  remove: async (id) => {
    try {
      await apiClient.delete(`/projektkalkyl/${id}`);
      set((state) => ({ kalkyler: state.kalkyler.filter((k) => !matchesEntityId(k, id)) }));
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Kunde inte radera kalkylen');
      throw err;
    }
  },
}));
