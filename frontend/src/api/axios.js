import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
let memoryCsrfToken = '';

export function setCsrfToken(token) {
  if (token) memoryCsrfToken = token;
}

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = memoryCsrfToken || readCookie('csrfToken');
    if (token) {
      config.headers['x-csrf-token'] = token;
    }
  }
  return config;
});

api.interceptors.response.use((response) => {
  if (response?.data?.csrfToken) {
    setCsrfToken(response.data.csrfToken);
  }
  return response;
});

export function isRequestCanceled(error) {
  return axios.isCancel(error) || error?.code === 'ERR_CANCELED' || error?.name === 'AbortError';
}

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || error?.message || fallback;
}

export default api;
