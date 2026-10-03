import apiClient from '@/src/api/apiClient';

// Superadmin mailer (ByggExp-BackEnd src/mailer): lists, subscribers,
// campaigns, event log and the marketing SMTP account.
const get = (url, params) => apiClient.get(url, { params }).then((r) => r.data);
const post = (url, body = {}) => apiClient.post(url, body).then((r) => r.data);
const put = (url, body = {}) => apiClient.put(url, body).then((r) => r.data);
const del = (url) => apiClient.delete(url).then((r) => r.data);

const senderQs = (sender) => (sender ? `?sender=${encodeURIComponent(sender)}` : '');

export const mailerApi = {
  lists: () => get('/mailer/lists'),
  createList: (body) => post('/mailer/lists', body),
  updateList: (id, body) => put(`/mailer/lists/${id}`, body),
  deleteList: (id) => del(`/mailer/lists/${id}`),
  importRows: (id, rows) => post(`/mailer/lists/${id}/import`, { rows }),
  verifyList: (id) => post(`/mailer/lists/${id}/verify`),

  subscribers: (params) => get('/mailer/subscribers', params),
  addSubscriber: (body) => post('/mailer/subscribers', body),
  updateSubscriber: (id, body) => put(`/mailer/subscribers/${id}`, body),
  deleteSubscribers: (ids) => post('/mailer/subscribers/delete', { ids }),

  campaigns: (status) => get('/mailer/campaigns', status ? { status } : undefined),
  campaignCounts: () => get('/mailer/campaigns/counts'),
  campaign: (id) => get(`/mailer/campaigns/${id}`),
  createCampaign: (body) => post('/mailer/campaigns', body),
  updateCampaign: (id, body) => put(`/mailer/campaigns/${id}`, body),
  deleteCampaign: (id) => del(`/mailer/campaigns/${id}`),
  duplicateCampaign: (id) => post(`/mailer/campaigns/${id}/duplicate`),
  startCampaign: (id, scheduledAt) => post(`/mailer/campaigns/${id}/start`, scheduledAt ? { scheduledAt } : {}),
  pauseCampaign: (id) => post(`/mailer/campaigns/${id}/pause`),
  resumeCampaign: (id) => post(`/mailer/campaigns/${id}/resume`),
  cancelCampaign: (id) => post(`/mailer/campaigns/${id}/cancel`),
  testCampaign: (id, to) => post(`/mailer/campaigns/${id}/test`, to ? { to } : {}),

  events: (params) => get('/mailer/events', params),

  // `sender` = sender profile key; omitted = the main (ByggExp) profile.
  settings: (sender) => get('/mailer/settings', sender ? { sender } : undefined),
  saveSettings: (body, sender) => put(`/mailer/settings${senderQs(sender)}`, body),
  verifySmtp: (sender) => post(`/mailer/settings/verify${senderQs(sender)}`),
  brevoWebhook: () => get('/mailer/settings/brevo-webhook'),
  dnsCheck: (sender) => get('/mailer/settings/dns', sender ? { sender } : undefined),
  senders: () => get('/mailer/settings/senders'),
  createSender: (label) => post('/mailer/settings/senders', { label }),
  deleteSender: (key) => del(`/mailer/settings/senders/${encodeURIComponent(key)}`),
};

export const apiError = (err, fallback) => err?.response?.data?.message || fallback;
