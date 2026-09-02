import { create } from 'zustand';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';

const EMPTY_GRID = { workers: [], from: null, to: null, projectId: null };

// The page fires overlapping loads (default range on mount, then again once the
// saved view/project is restored from localStorage). Without sequencing, the
// response that RESOLVES last wins — not the one that was requested last — so a
// stale default response could clobber the correct grid, leaving it empty until
// a reload. Only the newest request is allowed to write state.
let fetchSeq = 0;

export const useHoursStore = create((set) => ({
  grid: EMPTY_GRID,
  loading: false,
  error: null,

  // GET /hours?projectId&companyId&from&to → { workers:[{ workerId, name, cells:{date:{...}} }] }
  fetchGrid: async ({ projectId, companyId, from, to } = {}) => {
    const seq = (fetchSeq += 1);
    set({ loading: true, error: null });
    try {
      const params = {};
      if (projectId) params.projectId = projectId;
      if (companyId) params.companyId = companyId;
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await apiClient.get('/hours', { params });
      // A newer fetch superseded this one — drop the stale response.
      if (seq !== fetchSeq) return res.data;
      set({ grid: res.data || EMPTY_GRID, loading: false });
      return res.data;
    } catch (err) {
      if (seq !== fetchSeq) throw err;
      const msg = err.response?.data?.message || 'Failed to load hours';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  // DELETE /hours/adjustments — clear all planned corrections for a project in a
  // date range, so those cells fall back to the schedule baseline again.
  resetAdjustments: async ({ projectId, from, to }) => {
    try {
      const res = await apiClient.delete('/hours/adjustments', {
        params: { projectId, ...(from ? { from } : {}), ...(to ? { to } : {}) },
      });
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to reset planned hours');
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
}));
