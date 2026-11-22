import axios from 'axios';

const getBaseUrl = () => {
  // If explicitly provided via VITE_API_URL and not pointing to localhost on GitHub Pages
  if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')) {
    return import.meta.env.VITE_API_URL;
  }
  // If hosted on GitHub Pages, connect to the live Render cloud backend
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    return 'https://finance-tracker-backend-2dkm.onrender.com/api';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

const API_URL = getBaseUrl();

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Request interceptor: attach Bearer token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 logout and 429 rate limit
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // 401 Unauthorized: clear expired or invalid credentials
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // If not already on auth pages, trigger reload or event
        if (
          !window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register')
        ) {
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
      }

      // 429 Too Many Requests: provide user-friendly message
      if (status === 429) {
        const friendlyMessage =
          data?.error?.message ||
          'Too many requests sent in a short period. Please slow down and wait a moment.';
        error.friendlyMessage = friendlyMessage;
      }
    } else if (error.request) {
      error.friendlyMessage = 'Unable to connect to the server. Please ensure the backend is running.';
    }

    return Promise.reject(error);
  }
);

export default client;
