import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://byggexp.sda-api.ru';

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
    canManageUsers: true, // только в своей компании
    canManageProjects: true, // только в своей компании
    canManageTimeReports: false,
    canViewAll: false,
  },
  projectAdmin: {
    canManageCompanies: false,
    canManageUsers: false,
    canManageProjects: false, // только свои проекты
    canManageTimeReports: true,
    canViewAll: false,
  },
  worker: {
    canManageCompanies: false,
    canManageUsers: false,
    canManageProjects: false,
    canManageTimeReports: true, // только свои отчёты
    canViewAll: false,
  },
};

// Редирект по умолчанию для каждой роли
const ROLE_DEFAULT_REDIRECT = {
  superadmin: '/admin/companies',
  companyAdmin: '/company/projects',
  projectAdmin: '/projects/my',
  worker: '/projects/my',
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      // Вход
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'Неверный email или пароль');
          }

          const data = await res.json();

          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isLoading: false,
          });

          localStorage.setItem('accessToken', data.access_token);
          localStorage.setItem('refreshToken', data.refresh_token);
          localStorage.setItem('user', JSON.stringify(data.user));

          return data;
        } catch (err) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
      },

      clearAuth: () => {
        set({ user: null, accessToken: null, refreshToken: null, error: null });
        localStorage.clear();
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
        if (!user?.role) return '/login';
        return ROLE_DEFAULT_REDIRECT[user.role] || '/login';
      },

      isSuperAdmin: () => {
        return get().hasRole('superadmin');
      },

      isCompanyAdmin: () => {
        return get().hasRole('companyAdmin');
      },

      isProjectAdmin: () => {
        return get().hasRole('projectAdmin');
      },

      isWorker: () => {
        return get().hasRole('worker');
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
