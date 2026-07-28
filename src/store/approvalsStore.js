import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { matchesEntityId } from '@/src/utils/entityId';

// "Att göra" — everything waiting for the owner's decision in one place:
// expenses to review, supplier invoices to approve before payment, and leave
// requests. Shared by the header badge and the approvals screen so the count
// and the list stay in sync from a single fetch.
export const useApprovalsStore = create((set, get) => ({
  expenses: [],
  supplier: [],
  leave: [],
  loading: false,
  loaded: false,

  fetchAll: async () => {
    set({ loading: true });
    const [expenses, supplier, leave] = await Promise.all([
      apiClient.get('/expenses').then((res) => res.data).catch(() => []),
      apiClient.get('/supplier-invoices').then((res) => res.data).catch(() => []),
      apiClient.get('/leave', { params: { status: 'pending' } }).then((res) => res.data).catch(() => []),
    ]);
    set({
      expenses: (Array.isArray(expenses) ? expenses : []).filter((x) => x.status === 'submitted'),
      supplier: (Array.isArray(supplier) ? supplier : []).filter((x) => x.status === 'registered'),
      leave: (Array.isArray(leave) ? leave : []).filter((x) => x.status === 'pending'),
      loading: false,
      loaded: true,
    });
  },

  _remove: (key, id) => set((state) => ({
    [key]: state[key].filter((item) => !matchesEntityId(item, id)),
  })),

  approveExpense: async (id) => {
    try {
      await apiClient.patch(`/expenses/${id}/status`, { status: 'approved' });
      appMessage.success('Approved');
      get()._remove('expenses', id);
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to update status');
    }
  },

  rejectExpense: async (id) => {
    try {
      await apiClient.patch(`/expenses/${id}/status`, { status: 'rejected' });
      appMessage.success('Rejected');
      get()._remove('expenses', id);
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to update status');
    }
  },

  approveSupplier: async (id) => {
    try {
      await apiClient.patch(`/supplier-invoices/${id}/status`, { status: 'approved' });
      appMessage.success('Approved');
      get()._remove('supplier', id);
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to update status');
    }
  },

  approveLeave: async (id) => {
    try {
      await apiClient.patch(`/leave/${id}/review`, { status: 'approved' });
      appMessage.success('Approved');
      get()._remove('leave', id);
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to update status');
    }
  },

  rejectLeave: async (id) => {
    try {
      await apiClient.patch(`/leave/${id}/review`, { status: 'rejected' });
      appMessage.success('Rejected');
      get()._remove('leave', id);
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to update status');
    }
  },
}));
