import axios from 'axios';

// ─── API Base URL ─────────────────────────────────────────────────────────────
// Browser  → uses NEXT_PUBLIC_API_URL (http://localhost:3000) set in docker-compose
// SSR      → uses INTERNAL_API_URL (http://kiranaos_backend:3000) for Docker networking
// Fallback → http://localhost:3000 for local dev without Docker
const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') // browser
    : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'); // SSR

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Token Refresh State ──────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => (token ? prom.resolve(token) : prom.reject(error)));
  failedQueue = [];
};

// ─── Request Interceptor: Attach Access Token ─────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('kos_access_token');
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor: Auto Token Refresh on 401 ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip auth endpoints to prevent infinite loops
    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Queue parallel requests while refreshing
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken =
        typeof window !== 'undefined' ? localStorage.getItem('kos_refresh_token') : null;

      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const REFRESH_URL = `${API_URL}/auth/refresh`;
        const response = await axios.post(
          REFRESH_URL,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } },
        );

        const { accessToken: newAccess, refreshToken: newRefresh } = response.data.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('kos_access_token', newAccess);
          localStorage.setItem('kos_refresh_token', newRefresh);
        }

        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        processQueue(null, newAccess);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        if (typeof window !== 'undefined') {
          localStorage.removeItem('kos_access_token');
          localStorage.removeItem('kos_refresh_token');
          localStorage.removeItem('kos_user');
          localStorage.removeItem('kos_store');
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
