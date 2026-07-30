import { create } from 'zustand';
import { appMessage } from '@/src/utils/appMessage';
import apiClient from '@/src/api/apiClient';
import { matchesEntityId, getEntityId } from '@/src/utils/entityId';
import { getCertificateStatus, isCertificateActionable } from '@/src/features/users/certificates/certificateStatus';

// Flatten every user's expired / soon-to-expire certificate into one reminder
// list so the "Att göra" centre can nag about them alongside the approvals.
function collectCertificateReminders(users) {
  const list = [];
  (Array.isArray(users) ? users : []).forEach((user) => {
    const userId = getEntityId(user);
    (user.certificates || []).forEach((cert) => {
      if (!isCertificateActionable(cert)) {
        return;
      }
      const { status, daysLeft } = getCertificateStatus(cert);
      list.push({
        userId,
        userName: user.name || user.email || '—',
        certId: getEntityId(cert),
        name: cert.name,
        expiresAt: cert.expiresAt,
        status,
        daysLeft,
      });
    });
  });
  // Most urgent first (expired, then closest to expiry).
  return list.sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
}

// "Att göra" — everything waiting for the owner's decision in one place:
// expenses to review, supplier invoices to approve before payment, leave
// requests, and expiring employee certificates. Shared by the header badge and
// the approvals screen so the count and the list stay in sync from a single fetch.
export const useApprovalsStore = create((set, get) => ({
  expenses: [],
  supplier: [],
  leave: [],
  certificates: [],
  loading: false,
  loaded: false,

  fetchAll: async () => {
    set({ loading: true });
    const [expenses, supplier, leave, users] = await Promise.all([
      apiClient.get('/expenses').then((res) => res.data).catch(() => []),
      apiClient.get('/supplier-invoices').then((res) => res.data).catch(() => []),
      apiClient.get('/leave', { params: { status: 'pending' } }).then((res) => res.data).catch(() => []),
      apiClient.get('/users').then((res) => res.data).catch(() => []),
    ]);
    set({
      expenses: (Array.isArray(expenses) ? expenses : []).filter((x) => x.status === 'submitted'),
      supplier: (Array.isArray(supplier) ? supplier : []).filter((x) => x.status === 'registered'),
      leave: (Array.isArray(leave) ? leave : []).filter((x) => x.status === 'pending'),
      certificates: collectCertificateReminders(users),
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
