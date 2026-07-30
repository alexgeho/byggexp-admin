import { create } from 'zustand';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';

// Staffing assignments (bemanning): one user planned on one project for a day.
export const useAssignmentStore = create((set) => ({
  assignments: [],
  loading: false,

  fetchRange: async (from, to, projectId) => {
    set({ loading: true });
    try {
      const params = { from, to };
      if (projectId) params.projectId = projectId;
      const { data } = await apiClient.get('/assignments', { params });
      set({ assignments: Array.isArray(data) ? data : [], loading: false });
      return data;
    } catch {
      set({ loading: false });
      return [];
    }
  },

  create: async (payload) => {
    try {
      const { data } = await apiClient.post('/assignments', payload);
      set((state) => ({ assignments: [...state.assignments, data] }));
      return data;
    } catch (error) {
      appMessage.error(error.response?.data?.message || 'Failed to assign');
      throw error;
    }
  },

  update: async (id, payload) => {
    try {
      const { data } = await apiClient.put(`/assignments/${id}`, payload);
      set((state) => ({ assignments: state.assignments.map((a) => (a._id === id ? data : a)) }));
      return data;
    } catch (error) {
      appMessage.error(error.response?.data?.message || 'Failed to update');
      throw error;
    }
  },

  remove: async (id) => {
    try {
      await apiClient.delete(`/assignments/${id}`);
      set((state) => ({ assignments: state.assignments.filter((a) => a._id !== id) }));
    } catch (error) {
      appMessage.error(error.response?.data?.message || 'Failed to remove');
      throw error;
    }
  },
}));
