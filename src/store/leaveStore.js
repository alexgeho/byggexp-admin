import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { matchesEntityId } from '@/src/utils/entityId';

// Frånvaro — absence/leave requests.
export const useLeaveStore = create((set) => ({
  requests: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true });
    try {
      const res = await apiClient.get('/leave');
      set({ requests: res.data || [], loading: false });
      return res.data || [];
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to load leave requests');
      set({ loading: false });
      return [];
    }
  },

  create: async (payload) => {
    try {
      const res = await apiClient.post('/leave', payload);
      appMessage.success('Leave request saved');
      set((state) => ({ requests: [res.data, ...state.requests] }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save leave request');
      throw err;
    }
  },

  update: async (id, payload) => {
    try {
      const res = await apiClient.put(`/leave/${id}`, payload);
      appMessage.success('Leave request saved');
      set((state) => ({
        requests: state.requests.map((r) => (matchesEntityId(r, id) ? { ...r, ...res.data } : r)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save leave request');
      throw err;
    }
  },

  review: async (id, status, adminNote) => {
    try {
      const res = await apiClient.patch(`/leave/${id}/review`, { status, adminNote });
      appMessage.success('Status updated');
      set((state) => ({
        requests: state.requests.map((r) => (matchesEntityId(r, id) ? { ...r, ...res.data } : r)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to update status');
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await apiClient.delete(`/leave/${id}`);
      appMessage.success('Leave request deleted');
      set((state) => ({ requests: state.requests.filter((r) => !matchesEntityId(r, id)) }));
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to delete leave request');
      throw err;
    }
  },
}));
