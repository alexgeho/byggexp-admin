import { create } from 'zustand';
import { message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { sortByNewest } from '@/src/utils/sortByNewest';
import { matchesEntityId } from '@/src/utils/entityId';

export const useArticleStore = create((set, get) => ({
  articles: [],
  loading: false,
  error: null,

  fetchAllAccessible: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/articles');
      set({ articles: sortByNewest(res.data), loading: false });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load articles';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  create: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/articles', data);
      message.success('Article created');
      await get().fetchAllAccessible();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create article';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  update: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.put(`/articles/${id}`, data);
      message.success('Article updated');
      set((state) => ({
        articles: sortByNewest(state.articles.map((article) => (
          matchesEntityId(article, id) ? res.data : article
        ))),
        loading: false,
      }));
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update article';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  remove: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/articles/${id}`);
      message.success('Article deleted');
      set((state) => ({
        articles: state.articles.filter((article) => !matchesEntityId(article, id)),
        loading: false,
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete article';
      message.error(msg);
      set({ error: msg, loading: false });
      throw err;
    }
  },

  fetchNextNumber: async (companyId) => {
    const params = companyId ? { companyId } : undefined;
    const res = await apiClient.get('/articles/next-number', { params });
    return res.data?.nextNumber;
  },
}));
