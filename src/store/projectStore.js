import { create } from 'zustand';
import apiClient from '../api/apiClient';
import { message } from 'antd';
import { useAuthStore } from './authStore';

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/projects');
      set({ projects: res.data, loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load projects';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  fetchByCompany: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get(`/projects/company/${companyId}`);
      set({ projects: res.data, loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load company projects';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  fetchMy: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/projects/my');
      set({ projects: res.data, loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load projects';
      message.error(msg);
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
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  create: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/projects', data);
      const user = useAuthStore.getState().user;

      message.success('Project created');

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
      message.error(msg);
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
      message.success('Workers added');
      set((state) => ({
        projects: state.projects.map((p) => (p._id === projectId ? { ...p, ...res.data } : p)),
        currentProject: state.currentProject?._id === projectId ? res.data : state.currentProject,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add workers';
      message.error(msg);
      set({ error: msg });
      throw err;
    }
  },

  removeWorker: async (projectId, workerId) => {
    set({ error: null });
    try {
      const res = await apiClient.delete(`/projects/${projectId}/workers/${workerId}`);
      message.success('Worker removed from project');
      set((state) => ({
        projects: state.projects.map((p) => (p._id === projectId ? { ...p, ...res.data } : p)),
        currentProject: state.currentProject?._id === projectId ? res.data : state.currentProject,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove worker';
      message.error(msg);
      set({ error: msg });
      throw err;
    }
  },

  addProjectAdmin: async (projectId, userId) => {
    set({ error: null });
    try {
      const res = await apiClient.post(`/projects/${projectId}/admins/${userId}`);
      message.success('Project admin added');
      set((state) => ({
        projects: state.projects.map((p) => (p._id === projectId ? { ...p, ...res.data } : p)),
        currentProject: state.currentProject?._id === projectId ? res.data : state.currentProject,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add project admin';
      message.error(msg);
      set({ error: msg });
      throw err;
    }
  },

  update: async (id, projectData) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.put(`/projects/${id}`, projectData);
      message.success('Project updated');
      set((state) => ({
        projects: state.projects.map((p) => (p._id === id ? res.data : p)),
        currentProject: state.currentProject?._id === id ? res.data : state.currentProject,
        loading: false,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update project';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/projects/${id}`);
      message.success('Project deleted');
      set((state) => ({
        projects: state.projects.filter((p) => p._id !== id),
        currentProject: state.currentProject?._id === id ? null : state.currentProject,
        loading: false,
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete project';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  clearCurrentProject: () => {
    set({ currentProject: null });
  },
}));
