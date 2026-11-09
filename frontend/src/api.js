import axios from 'axios';

const host = typeof window !== 'undefined' && window.location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
const defaultBaseUrl = `http://${host}:8050/api`;

// Normalize base URL: strip trailing slashes and ensure /api prefix is present
const rawBaseUrl = (import.meta.env.VITE_API_URL || defaultBaseUrl).trim().replace(/\/+$/, '');
const finalBaseUrl = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;

const api = axios.create({
  baseURL: finalBaseUrl,
});

/**
 * Resolves static asset paths (like /uploads/resumes/...) against the backend host
 */
export const getAssetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const serverRoot = finalBaseUrl.replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${serverRoot}${cleanPath}`;
};

// Interceptor to add JWT token if exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle session expiration or unauthorized access
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      // Don't auto-redirect if user is in the middle of submitting credentials on the login page
      if (!requestUrl.includes('/auth/login') && !requestUrl.includes('/auth/google')) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user_name');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

