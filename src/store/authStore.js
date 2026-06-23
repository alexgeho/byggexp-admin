import { create } from 'zustand';
import { API_BASE_URL } from '../config/apiConfig';

const ROLE_PERMISSIONS = {
  superadmin: {
    canManageCompanies: true,
    canManageUsers: true,
    canManageProjects: true,
    canManageTimeReports: true,
    canViewAll: true,
  },
  companyAdmin: {
    canManageCompanies: false,
    canManageUsers: true, // only within their own company
    canManageProjects: true, // only within their own company
    canManageTimeReports: false,
    canViewAll: false,
  },
  projectAdmin: {
    canManageCompanies: false,
    canManageUsers: false,
    canManageProjects: false, // only assigned projects
    canManageTimeReports: true,
    canViewAll: false,
  },
  worker: {
    canManageCompanies: false,
    canManageUsers: false,
    canManageProjects: false,
    canManageTimeReports: true, // only their own reports
    canViewAll: false,
  },
};

// Default redirect for each role
const ROLE_DEFAULT_REDIRECT = {
  superadmin: '/admin/companies',
  companyAdmin: '/company/projects',
  projectAdmin: '/projects/my',
  worker: '/projects/my',
};

const AUTH_STORAGE_KEY = 'auth-session';
const LEGACY_PERSIST_STORAGE_KEY = 'auth-storage';

export function getRedirectPathForUser(user) {
  if (!user?.role) return '/login';
  return ROLE_DEFAULT_REDIRECT[user.role] || '/login';
}

export async function loginWithCredentials(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Invalid email or password');
  }

  return res.json();
}

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const normalizeStoredSession = (value) => {
  if (!value?.user || !value?.accessToken || !value?.refreshToken) {
    return null;
  }

  return {
    user: value.user,
    accessToken: value.accessToken,
    refreshToken: value.refreshToken,
  };
};

const readJsonStorage = (key) => {
  if (!canUseStorage()) {
    return null;
  }

  const rawValue = localStorage.getItem(key);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

const readPersistedAuthStorage = () => {
  const persistedValue = readJsonStorage(LEGACY_PERSIST_STORAGE_KEY);
  const persistedState = persistedValue?.state || persistedValue;

  return normalizeStoredSession(persistedState);
};

const readLegacySeparateAuthStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userRaw = localStorage.getItem('user');

  if (!accessToken || !refreshToken || !userRaw) {
    return null;
  }

  try {
    return normalizeStoredSession({
      user: JSON.parse(userRaw),
      accessToken,
      refreshToken,
    });
  } catch {
    return null;
  }
};

export const readStoredAuthSession = () => {
  if (!canUseStorage()) {
    return null;
  }

  return (
    normalizeStoredSession(readJsonStorage(AUTH_STORAGE_KEY)) ||
    readPersistedAuthStorage() ||
    readLegacySeparateAuthStorage()
  );
};

export const writeStoredAuthSession = (session) => {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  localStorage.removeItem(LEGACY_PERSIST_STORAGE_KEY);
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const clearStoredAuthSession = () => {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_PERSIST_STORAGE_KEY);
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  hasHydrated: false,
  isLoading: false,
  error: null,

  hydrateSession: () => {
    const session = readStoredAuthSession();

    if (session) {
      writeStoredAuthSession(session);
    }

    set({
      user: session?.user || null,
      accessToken: session?.accessToken || null,
      refreshToken: session?.refreshToken || null,
      hasHydrated: true,
      error: null,
    });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await loginWithCredentials(email, password);
      get().setSession(data);
      return data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  setSession: (data) => {
    const session = {
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };

    writeStoredAuthSession(session);

    set({
      ...session,
      hasHydrated: true,
      isLoading: false,
      error: null,
    });
  },

  logout: () => {
    clearStoredAuthSession();
    set({ user: null, accessToken: null, refreshToken: null, hasHydrated: true, error: null });
  },

  setTokens: (accessToken, refreshToken) => {
    const { user } = get();
    const session = { user, accessToken, refreshToken };

    if (user) {
      writeStoredAuthSession(session);
    }

    set({ accessToken, refreshToken });
  },

  clearAuth: () => {
    clearStoredAuthSession();
    set({ user: null, accessToken: null, refreshToken: null, hasHydrated: true, error: null });
  },

  getRole: () => {
    const { user } = get();
    return user?.role || null;
  },

  hasRole: (roles) => {
    const { user } = get();
    if (!user?.role) return false;
    if (!Array.isArray(roles)) return user.role === roles;
    return roles.includes(user.role);
  },

  can: (action) => {
    const { user } = get();
    if (!user?.role) return false;

    const permissions = ROLE_PERMISSIONS[user.role];
    if (!permissions) return false;

    const permissionKey = `can${action.charAt(0).toUpperCase()}${action.slice(1)}`;
    return permissions[permissionKey] === true;
  },

  getRedirectPath: () => {
    const { user } = get();
    return getRedirectPathForUser(user);
  },

  isSuperAdmin: () => get().hasRole('superadmin'),
  isCompanyAdmin: () => get().hasRole('companyAdmin'),
  isProjectAdmin: () => get().hasRole('projectAdmin'),
  isWorker: () => get().hasRole('worker'),
}));
