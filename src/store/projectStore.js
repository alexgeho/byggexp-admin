import { create } from 'zustand';
import apiClient from '@/src/api/apiClient';
import { appMessage } from '@/src/utils/appMessage';
import { useAuthStore } from '@/src/store/authStore';
import { sortByNewest } from '@/src/utils/sortByNewest';
import { matchesEntityId } from '@/src/utils/entityId';

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/projects');
      set({ projects: sortByNewest(res.data), loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load projects';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  fetchByCompany: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get(`/projects/company/${companyId}`);
      set({ projects: sortByNewest(res.data), loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load company projects';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  fetchMy: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/projects/my');
      set({ projects: sortByNewest(res.data), loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load projects';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  fetchOne: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get(`/projects/${id}/populated`);
      set({ currentProject: res.data, loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load project';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  create: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/projects', data);
      const user = useAuthStore.getState().user;

      appMessage.success('Project created');

      if (user?.role === 'superadmin') {
        await get().fetchAll();
      } else if (user?.role === 'companyAdmin' && user?.companyId) {
        await get().fetchByCompany(user.companyId);
      } else {
        await get().fetchMy();
      }

      set({ loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create project';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  addWorkers: async (projectId, workerIds) => {
    set({ error: null });
    try {
      const res = await apiClient.post(`/projects/${projectId}/workers`, {
        workerIds,
      });
      appMessage.success('Workers added');
      set((state) => ({
        projects: sortByNewest(
          state.projects.map((p) => (matchesEntityId(p, projectId) ? { ...p, ...res.data } : p)),
        ),
        currentProject: matchesEntityId(state.currentProject, projectId)
          ? res.data
          : state.currentProject,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add workers';
      appMessage.error(msg);
      set({ error: msg });
      throw err;
    }
  },

  removeWorker: async (projectId, workerId) => {
    set({ error: null });
    try {
      const res = await apiClient.delete(`/projects/${projectId}/workers/${workerId}`);
      appMessage.success('Worker removed from project');
      set((state) => ({
        projects: sortByNewest(
          state.projects.map((p) => (matchesEntityId(p, projectId) ? { ...p, ...res.data } : p)),
        ),
        currentProject: matchesEntityId(state.currentProject, projectId)
          ? res.data
          : state.currentProject,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove worker';
      appMessage.error(msg);
      set({ error: msg });
      throw err;
    }
  },

  addProjectAdmin: async (projectId, userId) => {
    set({ error: null });
    try {
      const res = await apiClient.post(`/projects/${projectId}/admins/${userId}`);
      appMessage.success('Project admin added');
      set((state) => ({
        projects: sortByNewest(
          state.projects.map((p) => (matchesEntityId(p, projectId) ? { ...p, ...res.data } : p)),
        ),
        currentProject: matchesEntityId(state.currentProject, projectId)
          ? res.data
          : state.currentProject,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add project admin';
      appMessage.error(msg);
      set({ error: msg });
      throw err;
    }
  },

  update: async (id, projectData) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.put(`/projects/${id}`, projectData);
      appMessage.success('Project updated');
      set((state) => ({
        projects: sortByNewest(state.projects.map((p) => (matchesEntityId(p, id) ? res.data : p))),
        currentProject: matchesEntityId(state.currentProject, id)
          ? res.data
          : state.currentProject,
        loading: false,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update project';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/projects/${id}`);
      appMessage.success('Project deleted');
      set((state) => ({
        projects: state.projects.filter((p) => !matchesEntityId(p, id)),
        currentProject: matchesEntityId(state.currentProject, id)
          ? null
          : state.currentProject,
        loading: false,
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete project';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  clearCurrentProject: () => {
    set({ currentProject: null });
  },
}));
