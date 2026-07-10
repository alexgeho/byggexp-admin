import { create } from 'zustand';
import { message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { matchesEntityId } from '@/src/utils/entityId';
import { sortByNewest } from '@/src/utils/sortByNewest';

export const useBugReportStore = create((set, get) => ({
  bugReports: [],
  loading: false,
  error: null,

  fetchAllAccessible: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/bug-reports');
      set({ bugReports: sortByNewest(res.data), loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load bug reports';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  create: async (data) => {
    set({ loading: true, error: null });
    try {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const res = await apiClient.post('/bug-reports', data, isFormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined);
      message.success('Bug report submitted');
      await get().fetchAllAccessible();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit bug report';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  update: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
      const res = await apiClient.put(`/bug-reports/${id}`, data, isFormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined);
      message.success('Bug report updated');
      set((state) => ({
        bugReports: sortByNewest(
          state.bugReports.map((report) =>
            matchesEntityId(report, id) ? res.data : report,
          ),
        ),
        loading: false,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update bug report';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  updateStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.patch(`/bug-reports/${id}/status`, { status });
      message.success('Bug report status updated');
      set((state) => ({
        bugReports: sortByNewest(
          state.bugReports.map((report) =>
            matchesEntityId(report, id) ? res.data : report,
          ),
        ),
        loading: false,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update bug report';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/bug-reports/${id}`);
      message.success('Bug report deleted');
      set((state) => ({
        bugReports: state.bugReports.filter((report) => !matchesEntityId(report, id)),
        loading: false,
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete bug report';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },
}));
