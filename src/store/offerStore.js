import { create } from 'zustand';
import { message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { sortByNewest } from '@/src/utils/sortByNewest';
import { matchesEntityId } from '@/src/utils/entityId';

export const useOfferStore = create((set, get) => ({
  offers: [],
  loading: false,
  error: null,

  fetchAllAccessible: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/offers');
      set({ offers: sortByNewest(res.data), loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load offers';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  create: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/offers', data);
      message.success('Offer created');
      await get().fetchAllAccessible();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create offer';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  update: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.put(`/offers/${id}`, data);
      message.success('Offer updated');
      set((state) => ({
        offers: sortByNewest(state.offers.map((offer) => (
          matchesEntityId(offer, id) ? res.data : offer
        ))),
        loading: false,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update offer';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/offers/${id}`);
      message.success('Offer deleted');
      set((state) => ({
        offers: state.offers.filter((offer) => !matchesEntityId(offer, id)),
        loading: false,
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete offer';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  copy: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post(`/offers/${id}/copy`);
      message.success('Offer copied');
      await get().fetchAllAccessible();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to copy offer';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  fetchNextNumber: async (companyId) => {
    const params = companyId ? { companyId } : undefined;
    const res = await apiClient.get('/offers/next-number', { params });
    return res.data?.offerNumber;
  },
}));
