import apiClient from '@/src/api/apiClient';

// Superadmin newsletter builder — see ByggExp-BackEnd src/newsletters.
export const newsletterApi = {
  list: () => apiClient.get('/newsletters').then((r) => r.data),
  get: (id) => apiClient.get(`/newsletters/${id}`).then((r) => r.data),
  create: (body = {}) => apiClient.post('/newsletters', body).then((r) => r.data),
  update: (id, body) => apiClient.put(`/newsletters/${id}`, body).then((r) => r.data),
  remove: (id) => apiClient.delete(`/newsletters/${id}`).then((r) => r.data),
  duplicate: (id) => apiClient.post(`/newsletters/${id}/duplicate`).then((r) => r.data),
  preview: (content) => apiClient.post('/newsletters/preview', content).then((r) => r.data),
  html: (id) => apiClient.get(`/newsletters/${id}/html`).then((r) => r.data),
  sendTest: (id, to) => apiClient.post(`/newsletters/${id}/test`, to ? { to } : {}).then((r) => r.data),
  uploadImage: (file) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post('/newsletters/images', form).then((r) => r.data.url);
  },
};
