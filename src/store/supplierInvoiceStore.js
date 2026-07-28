import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { sortByNewest } from '@/src/utils/sortByNewest';
import { matchesEntityId } from '@/src/utils/entityId';

export const useSupplierInvoiceStore = create((set, get) => ({
  invoices: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/supplier-invoices');
      set({ invoices: sortByNewest(res.data), loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load supplier invoices';
      appMessage.error(msg);
      set({ error: msg, loading: false });
      return [];
    }
  },

  create: async (payload) => {
    try {
      const res = await apiClient.post('/supplier-invoices', payload);
      appMessage.success('Supplier invoice saved');
      await get().fetchAll();
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save supplier invoice');
      throw err;
    }
  },

  update: async (id, payload) => {
    try {
      const res = await apiClient.put(`/supplier-invoices/${id}`, payload);
      appMessage.success('Supplier invoice saved');
      await get().fetchAll();
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save supplier invoice');
      throw err;
    }
  },

  updateStatus: async (id, status) => {
    try {
      const res = await apiClient.patch(`/supplier-invoices/${id}/status`, { status });
      appMessage.success('Status updated');
      set((state) => ({
        invoices: state.invoices.map((inv) => (matchesEntityId(inv, id) ? res.data : inv)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to update status');
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await apiClient.delete(`/supplier-invoices/${id}`);
      appMessage.success('Supplier invoice deleted');
      set((state) => ({ invoices: state.invoices.filter((inv) => !matchesEntityId(inv, id)) }));
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to delete supplier invoice');
      throw err;
    }
  },
}));
