import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { sortByNewest } from '@/src/utils/sortByNewest';
import { matchesEntityId } from '@/src/utils/entityId';

// Utlägg / kvitton — expense receipts submitted by workers and reviewed by
// admins. Approved/reimbursed receipts feed project costs.
export const useExpenseStore = create((set, get) => ({
  expenses: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true });
    try {
      const res = await apiClient.get('/expenses');
      set({ expenses: sortByNewest(res.data), loading: false });
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to load expenses');
      set({ loading: false });
      return [];
    }
  },

  create: async (payload) => {
    try {
      const res = await apiClient.post('/expenses', payload);
      appMessage.success('Expense saved');
      await get().fetchAll();
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save expense');
      throw err;
    }
  },

  update: async (id, payload) => {
    try {
      const res = await apiClient.put(`/expenses/${id}`, payload);
      appMessage.success('Expense saved');
      await get().fetchAll();
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save expense');
      throw err;
    }
  },

  setStatus: async (id, status) => {
    try {
      const res = await apiClient.patch(`/expenses/${id}/status`, { status });
      appMessage.success('Status updated');
      set((state) => ({
        expenses: state.expenses.map((e) => (matchesEntityId(e, id) ? res.data : e)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to update status');
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await apiClient.delete(`/expenses/${id}`);
      appMessage.success('Expense deleted');
      set((state) => ({ expenses: state.expenses.filter((e) => !matchesEntityId(e, id)) }));
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to delete expense');
      throw err;
    }
  },
}));
