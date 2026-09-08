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

// Pure totals helper — shared by the list and detail views so they always agree.
export function kalkylTotals(rows = []) {
  let income = 0;
  let cost = 0;
  for (const r of (rows || [])) {
    const amount = Number(r?.amount) || 0;
    if (r?.type === 'income') income += amount;
    else cost += amount;
  }
  const result = income - cost;
  const margin = income > 0 ? Math.round((result / income) * 100) : null;
  return { income, cost, result, margin };
}
