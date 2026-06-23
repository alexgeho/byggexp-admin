import { create } from 'zustand';
import { message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { sortByNewest } from '@/src/utils/sortByNewest';
import { matchesEntityId } from '@/src/utils/entityId';

export const useInvoiceStore = create((set, get) => ({
  invoices: [],
  loading: false,
  error: null,

  fetchAllAccessible: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/invoices');
      set({ invoices: sortByNewest(res.data), loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load invoices';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  create: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/invoices', data);
      message.success('Invoice created');
      await get().fetchAllAccessible();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create invoice';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  update: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.put(`/invoices/${id}`, data);
      message.success('Invoice updated');
      set((state) => ({
        invoices: sortByNewest(state.invoices.map((invoice) => (
          matchesEntityId(invoice, id) ? res.data : invoice
        ))),
        loading: false,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update invoice';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/invoices/${id}`);
      message.success('Invoice deleted');
      set((state) => ({
        invoices: state.invoices.filter((invoice) => !matchesEntityId(invoice, id)),
        loading: false,
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete invoice';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  copy: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post(`/invoices/${id}/copy`);
      message.success('Invoice copied');
      await get().fetchAllAccessible();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to copy invoice';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },
}));
