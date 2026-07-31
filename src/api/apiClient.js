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

apiClient.interceptors.response.use(
  (response) => {
    if (
      response.status === 200 &&
      (response.data === '' || response.data === undefined || response.data === null) &&
      response.headers['content-type']?.includes('application/json')
    ) {
      return Promise.reject(new Error(`Empty JSON response from ${response.config.url}`));
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
        const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = refreshRes.data;
        useAuthStore.getState().setTokens(access_token, refresh_token);

        // Retry the original request with the fresh token.
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
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
