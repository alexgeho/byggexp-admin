import { create } from 'zustand';
import apiClient from '../api/apiClient';
import { message } from 'antd';

export const useUserStore = create((set) => ({
  users: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/users');
      set({ users: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ error, loading: false });
      console.error('Failed to fetch users:', error);
      throw error;
    }
  },

  fetchByCompany: async (companyId) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get(`/users/company/${companyId}`);
      set({ users: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ error, loading: false });
      console.error('Failed to fetch users by company:', error);
      throw error;
    }
  },

  fetchByProject: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get(`/users/project/${projectId}`);
      set({ users: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ error, loading: false });
      console.error('Failed to fetch users by project:', error);
      throw error;
    }
  },

  fetchByRole: async (role) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get(`/users/role/${role}`);
      set({ users: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ error, loading: false });
      console.error('Failed to fetch users by role:', error);
      throw error;
    }
  },

  create: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/users', userData);
      message.success('User created');
      set((state) => ({
        users: [...state.users, response.data],
        loading: false,
      }));
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to create user';
      message.error(msg);
      set({ error: msg, loading: false });
      throw error;
    }
  },

  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/auth/register', userData);
      message.success('User registered');
      set((state) => ({
        users: [...state.users, response.data],
        loading: false,
      }));
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to register user';
      message.error(msg);
      set({ error: msg, loading: false });
      throw error;
    }
  },

  update: async (id, userData) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.put(`/users/${id}`, userData);
      message.success('User updated');
      set((state) => ({
        users: state.users.map((u) => (u._id === id ? response.data : u)),
        loading: false,
      }));
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update user';
      message.error(msg);
      set({ error: msg, loading: false });
      throw error;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/users/${id}`);
      message.success('User deleted');
      set((state) => ({
        users: state.users.filter((u) => u._id !== id),
        loading: false,
      }));
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to delete user';
      message.error(msg);
      set({ error: msg, loading: false });
      throw error;
    }
  },

  clearUsers: () => {
    set({ users: [] });
  },
}));
