import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { sortByNewest } from '@/src/utils/sortByNewest';

export const useShiftStore = create((set) => ({
  shifts: [],
  days: [],
  currentShift: null,
  timeline: [],
  timelineLoading: false,
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

  // Loads the chronological shift event timeline. This endpoint is being rolled
  // out separately, so a 404 (not deployed yet) or an empty response must NOT
  // surface an error toast or break the detail page — we quietly fall back to an
  // empty timeline and let the UI show the existing Segments card instead.
  fetchTimeline: async (id) => {
    set({ timelineLoading: true });

    try {
      const res = await apiClient.get(`/shifts/${id}/timeline`);
      set({
        timeline: Array.isArray(res.data) ? res.data : (res.data?.items || []),
        timelineLoading: false,
      });

      return res.data;
    } catch (err) {
      const status = err.response?.status;
      // Only warn on genuinely unexpected failures; a missing endpoint is fine.
      if (status && status !== 404) {
        appMessage.error(err.response?.data?.message || 'Failed to load shift timeline');
      }
      set({ timeline: [], timelineLoading: false });
      return null;
    }
  },

  clearCurrentShift: () => {
    set({ currentShift: null, timeline: [] });
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
