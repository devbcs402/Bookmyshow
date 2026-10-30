import axios from 'axios';
import { STORAGE_KEYS } from '../../constants';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  timeout: 15000
});

// Request interceptor to attach JWT access token
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor with mutex refresh queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Skip refresh retry if request was to login/refresh itself or already retried
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data?.data?.accessToken;
        if (newAccessToken) {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        window.dispatchEvent(new CustomEvent('bms:auth:expired'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeApiError(error));
  }
);

/**
 * Normalizes Axios error into a clean user-friendly object
 */
export function normalizeApiError(error) {
  if (error.response?.data) {
    const res = error.response.data;
    return {
      message: res.message || res.error?.message || 'An unexpected server error occurred',
      errorCode: res.errorCode || res.error?.code || 'UNKNOWN_ERROR',
      statusCode: error.response.status,
      details: res.error?.details || res.details || null
    };
  }
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      message: 'Connection timed out. Please check your network and try again.',
      errorCode: 'TIMEOUT',
      statusCode: 408
    };
  }
  return {
    message: error.message || 'Unable to connect to the movie booking server',
    errorCode: 'NETWORK_ERROR',
    statusCode: 0
  };
}

export default apiClient;

