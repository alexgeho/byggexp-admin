import { create } from 'zustand';
import { message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { matchesEntityId } from '@/src/utils/entityId';
import { sortByNewest } from '@/src/utils/sortByNewest';

export const useBugReportStore = create((set) => ({
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
}));
