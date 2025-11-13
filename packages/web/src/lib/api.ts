import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    login: (cursorApiKey: string, email?: string) =>
      apiClient.post('/auth/cursor-login', { cursorApiKey, email }),
    logout: () => apiClient.post('/auth/logout'),
    me: () => apiClient.get('/auth/me'),
  },
  orchestration: {
    create: (data: { repository: string; ref?: string; prompt: string }) =>
      apiClient.post('/orchestration/create', data),
    list: () => apiClient.get('/orchestration/list'),
    get: (id: string) => apiClient.get(`/orchestration/${id}`),
    getConversation: (id: string) => apiClient.get(`/orchestration/${id}/conversation`),
    answer: (id: string, answers: Record<string, string>) =>
      apiClient.post(`/orchestration/${id}/answer`, { answers }),
    approve: (id: string) => apiClient.post(`/orchestration/${id}/approve`),
    cancel: (id: string) => apiClient.post(`/orchestration/${id}/cancel`),
  },
};
