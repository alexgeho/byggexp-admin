import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { sortByNewest } from '@/src/utils/sortByNewest';

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
        shifts: sortByNewest(res.data.items || []),
        days: res.data.days || [],
        loading: false,
      });

      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load shifts';
      appMessage.error(msg);
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
      appMessage.error(msg);
      set({ error: msg, loading: false, currentShift: null });
      throw err;
    }
  },

  clearCurrentShift: () => {
    set({ currentShift: null });
  },

  uploadPhotos: async (shiftId, files) => {
    set({ error: null });

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('photos', file);
      });

      const res = await apiClient.post(`/shifts/${shiftId}/photos`, formData);
      appMessage.success('Photos uploaded');
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload photos';
      appMessage.error(msg);
      set({ error: msg });
      throw err;
    }
  },
}));
