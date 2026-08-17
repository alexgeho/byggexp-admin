import apiClient from '@/src/api/apiClient';

// Colour maps, URL resolution and the activity-log filter option lists for the
// user detail page. Framework-free so they stay easy to reuse and test.

export const getRoleColor = (role) => ({
  superadmin: 'red',
  companyAdmin: 'orange',
  projectAdmin: 'blue',
  worker: 'green',
}[role] || 'default');

export const getLogLevelColor = (level) => ({
  info: 'blue',
  warning: 'gold',
  error: 'red',
}[level] || 'default');

export const resolveUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, apiClient.defaults.baseURL).toString();
  } catch {
    return url;
  }
};

export const CATEGORY_OPTIONS = [
  { label: 'All categories', value: '' },
  { label: 'auth', value: 'auth' },
  { label: 'notifications', value: 'notifications' },
];

export const LEVEL_OPTIONS = [
  { label: 'All levels', value: '' },
  { label: 'info', value: 'info' },
  { label: 'warning', value: 'warning' },
  { label: 'error', value: 'error' },
];
