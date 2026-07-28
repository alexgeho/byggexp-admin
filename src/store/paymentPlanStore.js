import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { matchesEntityId } from '@/src/utils/entityId';

// Betalningsplan — à conto milestone billing per project.
export const usePaymentPlanStore = create((set) => ({
  plans: [],
  loading: false,

  fetchByProject: async (projectId) => {
    if (!projectId) return [];
    set({ loading: true });
    try {
      const res = await apiClient.get('/payment-plans', { params: { projectId } });
      set({ plans: res.data || [], loading: false });
      return res.data || [];
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to load payment plan');
      set({ loading: false });
      return [];
    }
  },

  create: async (payload) => {
    try {
      const res = await apiClient.post('/payment-plans', payload);
      appMessage.success('Payment plan saved');
      set((state) => ({ plans: [res.data, ...state.plans] }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save payment plan');
      throw err;
    }
  },

  update: async (id, payload) => {
    try {
      const res = await apiClient.put(`/payment-plans/${id}`, payload);
      appMessage.success('Payment plan saved');
      set((state) => ({
        plans: state.plans.map((p) => (matchesEntityId(p, id) ? res.data : p)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save payment plan');
      throw err;
    }
  },

  setRowStatus: async (id, rowIndex, status, invoiceNumber) => {
    try {
      const res = await apiClient.patch(`/payment-plans/${id}/rows/${rowIndex}/status`, {
        status,
        invoiceNumber,
      });
      set((state) => ({
        plans: state.plans.map((p) => (matchesEntityId(p, id) ? res.data : p)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to update row');
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await apiClient.delete(`/payment-plans/${id}`);
      appMessage.success('Payment plan deleted');
      set((state) => ({ plans: state.plans.filter((p) => !matchesEntityId(p, id)) }));
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to delete payment plan');
      throw err;
    }
  },
}));
