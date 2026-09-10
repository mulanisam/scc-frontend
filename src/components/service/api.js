import axios from 'axios';
import { API_BASE_URL } from '../../config/axiosConfig';
import { notifyAuthChanged } from '../../auth/AuthContext';

/**
 * Centralized Axios instance with request/response interceptors.
 * - Attaches Authorization header from localStorage token.
 * - Handles 401 (session expiry) by logging out and redirecting to login.
 * - Provides consistent error objects for downstream consumers.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds default timeout
});

/**
 * Request interceptor: add auth token if present.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor: normalize errors and handle session expiry.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      // Session expired or unauthorized
      if (status === 401) {
        // Centralized 401 handling: clear credentials and let AuthProvider
        // re-read the session and redirect.
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        notifyAuthChanged();
        return Promise.reject(new Error('Session expired. Please login again.'));
      }
      // For other statuses, reject with standardized message
      const message = data?.message || `API Error: ${status}`;
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // Network error
      return Promise.reject(new Error('Network error. Please check your connection.'));
    } else {
      // Other errors (e.g., config)
      return Promise.reject(new Error(error.message));
    }
  }
);

export default apiClient;