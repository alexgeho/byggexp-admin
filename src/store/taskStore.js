import { create } from 'zustand';
import { message } from 'antd';
import apiClient from '../api/apiClient';

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchAllAccessible: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/tasks');
      set({ tasks: res.data, loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load tasks';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  create: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/tasks', data);
      message.success('Task created');
      await get().fetchAllAccessible();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create task';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  update: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.put(`/tasks/${id}`, data);
      message.success('Task updated');
      set((state) => ({
        tasks: state.tasks.map((task) => (task._id === id ? res.data : task)),
        loading: false,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update task';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/tasks/${id}`);
      message.success('Task deleted');
      set((state) => ({
        tasks: state.tasks.filter((task) => task._id !== id),
        loading: false,
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete task';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },
}));
