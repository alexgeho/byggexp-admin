import { create } from 'zustand';
import apiClient from '../api/apiClient';
import { message } from 'antd';

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
      const msg = err.response?.data?.message || 'Ошибка загрузки проектов';
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
      const msg = err.response?.data?.message || 'Ошибка загрузки проектов компании';
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
      const msg = err.response?.data?.message || 'Ошибка загрузки проектов';
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
      const msg = err.response?.data?.message || 'Ошибка загрузки проекта';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  create: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/projects', data);
      message.success('Проект создан!');
      await get().fetchMy(); 
      set({ loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Ошибка создания проекта';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  addWorkers: async (projectId, workerIds) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post(`/projects/${projectId}/workers`, {
        workerIds,
      });
      message.success('Работники добавлены');
      set({ loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Ошибка добавления работников';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  removeWorker: async (projectId, workerId) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.delete(`/projects/${projectId}/workers/${workerId}`);
      message.success('Работник удалён из проекта');
      set({ loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Ошибка удаления работника';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  addProjectAdmin: async (projectId, userId) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post(`/projects/${projectId}/admins/${userId}`);
      message.success('ProjectAdmin добавлен');
      set({ loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Ошибка добавления ProjectAdmin';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  update: async (id, projectData) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.put(`/projects/${id}`, projectData);
      message.success('Проект обновлён');
      set((state) => ({
        projects: state.projects.map((p) => (p._id === id ? res.data : p)),
        currentProject: state.currentProject?._id === id ? res.data : state.currentProject,
        loading: false,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Ошибка обновления проекта';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/projects/${id}`);
      message.success('Проект удалён');
      set((state) => ({
        projects: state.projects.filter((p) => p._id !== id),
        currentProject: state.currentProject?._id === id ? null : state.currentProject,
        loading: false,
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Ошибка удаления проекта';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  clearCurrentProject: () => {
    set({ currentProject: null });
  },
}));
