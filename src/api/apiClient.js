import axios from 'axios';
import { useAuthStore } from '@/src/store/authStore';
import { API_BASE_URL } from '@/src/config/apiConfig';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the auth token to every request.
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
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

    return Promise.reject(error);
  }
);

export default apiClient;
