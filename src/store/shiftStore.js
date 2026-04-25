import { create } from 'zustand';
import { message } from 'antd';
import apiClient from '../api/apiClient';

export const useShiftStore = create((set) => ({
  shifts: [],
  days: [],
  currentShift: null,
  loading: false,
  error: null,

  fetchAllAccessible: async (params = {}) => {
    set({ loading: true, error: null });

    try {
      const res = await apiClient.get('/shifts/list', { params });
      set({
        shifts: res.data.items || [],
        days: res.data.days || [],
        loading: false,
      });

      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load shifts';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  fetchOne: async (id) => {
    set({ loading: true, error: null });

    try {
      const res = await apiClient.get(`/shifts/${id}`);
      set({
        currentShift: res.data,
        loading: false,
      });

      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load shift';
      message.error(msg);
      set({ error: msg, loading: false, currentShift: null });
      throw err;
    }
  },

  clearCurrentShift: () => {
    set({ currentShift: null });
  },
}));
