import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { matchesEntityId } from '@/src/utils/entityId';

// KMA — egenkontroll templates (mallar) + checklist instances.
export const useChecklistStore = create((set) => ({
  templates: [],
  checklists: [],
  loadingTemplates: false,
  loadingChecklists: false,

  // ---- Templates ----
  fetchTemplates: async () => {
    set({ loadingTemplates: true });
    try {
      const res = await apiClient.get('/checklists/templates');
      set({ templates: res.data || [], loadingTemplates: false });
      return res.data || [];
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to load templates');
      set({ loadingTemplates: false });
      return [];
    }
  },

  createTemplate: async (payload) => {
    try {
      const res = await apiClient.post('/checklists/templates', payload);
      appMessage.success('Template saved');
      set((state) => ({ templates: [...state.templates, res.data] }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save template');
      throw err;
    }
  },

  updateTemplate: async (id, payload) => {
    try {
      const res = await apiClient.put(`/checklists/templates/${id}`, payload);
      appMessage.success('Template saved');
      set((state) => ({
        templates: state.templates.map((tpl) => (matchesEntityId(tpl, id) ? res.data : tpl)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save template');
      throw err;
    }
  },

  removeTemplate: async (id) => {
    try {
      await apiClient.delete(`/checklists/templates/${id}`);
      appMessage.success('Template deleted');
      set((state) => ({ templates: state.templates.filter((tpl) => !matchesEntityId(tpl, id)) }));
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to delete template');
      throw err;
    }
  },

  // ---- Checklists (egenkontroller) ----
  fetchChecklists: async (projectId) => {
    set({ loadingChecklists: true });
    try {
      const res = await apiClient.get('/checklists', {
        params: projectId ? { projectId } : {},
      });
      set({ checklists: res.data || [], loadingChecklists: false });
      return res.data || [];
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to load checklists');
      set({ loadingChecklists: false });
      return [];
    }
  },

  createChecklist: async (payload) => {
    try {
      const res = await apiClient.post('/checklists', payload);
      appMessage.success('Checklist created');
      set((state) => ({ checklists: [res.data, ...state.checklists] }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to create checklist');
      throw err;
    }
  },

  updateChecklist: async (id, payload) => {
    try {
      const res = await apiClient.put(`/checklists/${id}`, payload);
      set((state) => ({
        checklists: state.checklists.map((c) => (matchesEntityId(c, id) ? res.data : c)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save checklist');
      throw err;
    }
  },

  signChecklist: async (id, signedByName) => {
    try {
      const res = await apiClient.post(`/checklists/${id}/sign`, { signedByName });
      appMessage.success('Checklist signed');
      set((state) => ({
        checklists: state.checklists.map((c) => (matchesEntityId(c, id) ? res.data : c)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to sign checklist');
      throw err;
    }
  },

  // ---- AI egenkontroll ----
  aiEnabled: false,
  fetchAiStatus: async () => {
    try {
      const res = await apiClient.get('/checklists/ai-status');
      set({ aiEnabled: Boolean(res.data?.enabled) });
    } catch {
      set({ aiEnabled: false });
    }
  },

  // Contract / arbetsbeskrivning → { title, category, items, sourceDocument }.
  draftFromDocument: async (file) => {
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await apiClient.post('/checklists/draft-from-document', body, { timeout: 180000 });
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Could not read the document');
      throw err;
    }
  },

  addPhotos: async (id, files) => {
    const body = new FormData();
    files.forEach((f) => body.append('photos', f));
    try {
      const res = await apiClient.post(`/checklists/${id}/photos`, body, { timeout: 180000 });
      set((state) => ({
        checklists: state.checklists.map((c) => (matchesEntityId(c, id) ? res.data : c)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to upload photos');
      throw err;
    }
  },

  decideSuggestion: async (id, index, accept) => {
    try {
      const res = await apiClient.post(`/checklists/${id}/items/${index}/suggestion`, { accept });
      set((state) => ({
        checklists: state.checklists.map((c) => (matchesEntityId(c, id) ? res.data : c)),
      }));
      return res.data;
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to save checklist');
      throw err;
    }
  },

  removeChecklist: async (id) => {
    try {
      await apiClient.delete(`/checklists/${id}`);
      appMessage.success('Checklist deleted');
      set((state) => ({ checklists: state.checklists.filter((c) => !matchesEntityId(c, id)) }));
    } catch (err) {
      appMessage.error(err.response?.data?.message || 'Failed to delete checklist');
      throw err;
    }
  },
}));
