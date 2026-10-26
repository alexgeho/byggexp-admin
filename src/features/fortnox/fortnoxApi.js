import apiClient from '@/src/api/apiClient';

// Fortnox integration endpoints (backend src/fortnox).
// Status never fails the page: an unreachable backend reads as "not configured".
let statusPromise = null;

export function fetchFortnoxStatus({ fresh = false } = {}) {
  if (fresh || !statusPromise) {
    statusPromise = apiClient
      .get('/fortnox/status')
      .then(({ data }) => data || { configured: false })
      .catch(() => ({ configured: false }));
  }
  return statusPromise;
}

export async function connectFortnox() {
  const { data } = await apiClient.get('/fortnox/connect-url');
  statusPromise = null;
  window.location.assign(data.url);
}

export async function disconnectFortnox() {
  await apiClient.delete('/fortnox/connection');
  statusPromise = null;
}

export async function sendInvoiceToFortnox(invoiceId) {
  const { data } = await apiClient.post(`/fortnox/invoices/${invoiceId}`);
  return data;
}

export async function sendPayrollToFortnox({ from, to, userIds = [], force = false }) {
  const { data } = await apiClient.post('/fortnox/payroll', {
    from, to, ...(userIds.length ? { userIds } : {}), ...(force ? { force: true } : {}),
  });
  return data;
}
