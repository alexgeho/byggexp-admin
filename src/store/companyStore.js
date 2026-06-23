import { create } from 'zustand';
import apiClient from '@/src/api/apiClient';
import { sortByNewest } from '@/src/utils/sortByNewest';
import { matchesEntityId } from '@/src/utils/entityId';

function normalizeCompanyRecord(record) {
  if (record?.company && typeof record.company === 'object') {
    return record.company;
  }

  return record;
}

export const useCompanyStore = create((set) => ({
  companies: [],
  currentCompany: null,
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/company');
      set({
        companies: sortByNewest(response.data.map(normalizeCompanyRecord)),
        loading: false,
      });
      return response.data;
    } catch (error) {
      set({ error, loading: false });
      console.error('Failed to fetch companies:', error);
      throw error;
    }
  },

  fetchMy: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/company/my');
      set({ currentCompany: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ error, loading: false });
      console.error('Failed to fetch my company:', error);
      throw error;
    }
  },

  registerWithAdmin: async (companyData) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/company/register', companyData);
      const company = response.data?.company ?? response.data;
      set((state) => ({
        companies: sortByNewest([...state.companies, company]),
        loading: false,
      }));
      return company;
    } catch (error) {
      set({ error, loading: false });
      console.error('Failed to register company with admin:', error);
      throw error;
    }
  },

  create: async (companyData) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post('/company', companyData);
      set((state) => ({
        companies: sortByNewest([...state.companies, response.data]),
        loading: false,
      }));
      return response.data;
    } catch (error) {
      set({ error, loading: false });
      console.error('Failed to create company:', error);
      throw error;
    }
  },

  update: async (id, companyData) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.put(`/company/${id}`, companyData);
      set((state) => ({
        companies: sortByNewest(
          state.companies.map((c) => (matchesEntityId(c, id) ? response.data : c)),
        ),
        currentCompany: matchesEntityId(state.currentCompany, id)
          ? response.data
          : state.currentCompany,
        loading: false,
      }));
      return response.data;
    } catch (error) {
      set({ error, loading: false });
      console.error('Failed to update company:', error);
      throw error;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/company/${id}`);
      set((state) => ({
        companies: state.companies.filter((c) => !matchesEntityId(c, id)),
        currentCompany: matchesEntityId(state.currentCompany, id)
          ? null
          : state.currentCompany,
        loading: false,
      }));
    } catch (error) {
      set({ error, loading: false });
      console.error('Failed to delete company:', error);
      throw error;
    }
  },

  clearCurrentCompany: () => {
    set({ currentCompany: null });
  },
}));
