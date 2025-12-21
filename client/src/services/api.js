import axios from 'axios';

const API_URL = '/api';

// Cases API
export const casesAPI = {
  getAll: (params) => axios.get(`${API_URL}/cases`, { params }),
  getById: (id) => axios.get(`${API_URL}/cases/${id}`),
  create: (data) => axios.post(`${API_URL}/cases`, data),
  update: (id, data) => axios.put(`${API_URL}/cases/${id}`, data),
  delete: (id) => axios.delete(`${API_URL}/cases/${id}`),
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

