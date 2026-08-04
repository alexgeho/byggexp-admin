import { create } from 'zustand';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';

const EMPTY_GRID = { workers: [], from: null, to: null, projectId: null };

export const useHoursStore = create((set) => ({
  grid: EMPTY_GRID,
  loading: false,
  error: null,

  // GET /hours?projectId&from&to → { workers:[{ workerId, name, cells:{date:{...}} }] }
  fetchGrid: async ({ projectId, from, to } = {}) => {
    set({ loading: true, error: null });
    try {
      const params = {};
      if (projectId) params.projectId = projectId;
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await apiClient.get('/hours', { params });
      set({ grid: res.data || EMPTY_GRID, loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load hours';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  // PUT /hours/adjustment — persist an admin correction for one worker-day-project.
  saveAdjustment: async ({ projectId, workerId, date, plannedHours, note }) => {
    try {
      const res = await apiClient.put('/hours/adjustment', {
        projectId,
        workerId,
        date,
        plannedHours,
        ...(note !== undefined ? { note } : {}),
      });
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save correction');
      throw err;
    }
  },

  // POST /shifts/manual — set a worker's Manual hours for one day/project
  // (upserts the day's shift or creates a manual-only one). durationMs = ms.
  saveManualHours: async ({ projectId, workerId, date, durationMs }) => {
    try {
      const res = await apiClient.post('/shifts/manual', {
        projectId,
        workerId,
        date,
        durationMs,
      });
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save manual hours');
      throw err;
    }
  },
}));
