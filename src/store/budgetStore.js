import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';

const empty = () => Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));

// Company budget plan (manual monthly income/expense), one document per year.
export const useBudgetStore = create((set) => ({
  months: empty(),
  year: null,
  loading: false,

  fetchYear: async (year) => {
    set({ loading: true });
    try {
      const { data } = await apiClient.get('/budget', { params: { year } });
      const months = empty();
      (data?.months || []).slice(0, 12).forEach((m, i) => {
        months[i] = { income: Number(m?.income) || 0, expense: Number(m?.expense) || 0 };
      });
      set({ months, year, loading: false });
      return months;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to load budget');
      set({ months: empty(), year, loading: false });
      return empty();
    }
  },

  save: async (year, months) => {
    try {
      const { data } = await apiClient.put('/budget', { year, months });
      appMessage.success('Budget saved');
      return data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save budget');
      throw err;
    }
  },
}));
