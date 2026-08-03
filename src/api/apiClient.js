import axios from 'axios';
import { useAuthStore } from '@/src/store/authStore';
import { API_BASE_URL } from '@/src/config/apiConfig';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  },
  // Never treat cached 304 as success — body is empty and breaks stores.
  validateStatus: (status) => status >= 200 && status < 300,
});

// Attach the auth token to every request.
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // Avoid browser/proxy conditional cache hits on API reads.
  delete config.headers['If-None-Match'];
  delete config.headers['If-Modified-Since'];

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Single-flight token refresh: when the access token expires the dashboard
// fires many requests at once, and every one gets a 401. Without a shared
// refresh they would each POST /auth/refresh in parallel and each overwrite the
// session — a race that intermittently left the app authenticated-but-empty.
// We coalesce all concurrent 401s onto ONE refresh promise instead.
let refreshPromise = null;

async function refreshSession() {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  });

  useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
  // /auth/refresh returns a fresh user straight from the DB (role, companyId).
  // Sync it into the session so a stale/missing companyId self-heals instead of
  // silently breaking every company-scoped request until the next manual login.
  if (data.user) {
    useAuthStore.getState().updateUserInSession(data.user);
  }

  return data.access_token;
}

apiClient.interceptors.response.use(
  (response) => {
    // NestJS/Express may return HTTP 200 with an empty body for `null`.
    if (
      response.status === 200 &&
      (response.data === '' || response.data === undefined) &&
      response.headers['content-type']?.includes('application/json')
    ) {
      response.data = null;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken } = useAuthStore.getState();

      if (!refreshToken) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Reuse the in-flight refresh if one is already running.
        if (!refreshPromise) {
          refreshPromise = refreshSession().finally(() => { refreshPromise = null; });
        }
        const accessToken = await refreshPromise;

        // Retry the original request with the fresh token.
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    // Soft paywall: a mutation was blocked because the subscription lapsed.
    if (error.response?.status === 402) {
      import('@/src/utils/appMessage')
        .then(({ appMessage }) => appMessage.warning(
          error.response?.data?.message || 'Prenumeration krävs.',
        ))
        .catch(() => undefined);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
