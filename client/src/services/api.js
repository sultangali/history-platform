import axios from 'axios';

// Используем переменную окружения для API URL
// В dev mode: http://localhost:5000/api (через proxy в vite.config.js или напрямую)
// В prod mode: https://yourdomain.com/api (из .env.production)
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Cases API
export const casesAPI = {
  getAll: (params) => axios.get(`${API_URL}/cases`, { params }),
  getById: (id) => axios.get(`${API_URL}/cases/${id}`),
  create: (data) => axios.post(`${API_URL}/cases`, data),
  update: (id, data) => axios.put(`${API_URL}/cases/${id}`, data),
  delete: (id) => axios.delete(`${API_URL}/cases/${id}`),
  bulkDelete: (ids) => axios.delete(`${API_URL}/cases/bulk/delete`, { data: { ids } }),
  getMyCases: () => axios.get(`${API_URL}/cases/moderator/my-cases`),
  getStatistics: () => axios.get(`${API_URL}/cases/moderator/statistics`),
  updateStatus: (id, status) => axios.put(`${API_URL}/cases/${id}`, { status }),
  search: (query) => axios.get(`${API_URL}/cases/search`, { params: { q: query } })
};

// Suggestions API
export const suggestionsAPI = {
  getAll: () => axios.get(`${API_URL}/suggestions`),
  create: (data) => axios.post(`${API_URL}/suggestions`, data),
  update: (id, status) => axios.put(`${API_URL}/suggestions/${id}`, { status }),
  delete: (id) => axios.delete(`${API_URL}/suggestions/${id}`)
};

// Feedback API
export const feedbackAPI = {
  getAll: () => axios.get(`${API_URL}/feedback`),
  create: (data) => axios.post(`${API_URL}/feedback`, data),
  markAsRead: (id) => axios.put(`${API_URL}/feedback/${id}/read`),
  reply: (id, message) => axios.post(`${API_URL}/feedback/${id}/reply`, { message }),
  delete: (id) => axios.delete(`${API_URL}/feedback/${id}`)
};

// Users API (Admin only)
export const usersAPI = {
  getAll: () => axios.get(`${API_URL}/users`),
  update: (id, data) => axios.put(`${API_URL}/users/${id}`, data),
  delete: (id) => axios.delete(`${API_URL}/users/${id}`)
};

export default {
  cases: casesAPI,
  suggestions: suggestionsAPI,
  feedback: feedbackAPI,
  users: usersAPI
};

