import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pgpos_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('pgpos_refresh_token');
        if (refreshToken) {
          const response = await api.post('/auth/refresh-token', {
            refreshToken,
          });
          const { token, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('pgpos_token', token);
          if (newRefreshToken) {
            localStorage.setItem('pgpos_refresh_token', newRefreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('pgpos_token');
        localStorage.removeItem('pgpos_refresh_token');
        localStorage.removeItem('pgpos_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  refreshToken: (data) => api.post('/auth/refresh-token', data),
};

// Dashboard API
export const dashboardAPI = {
  getSummary: () => api.get('/dashboard'),
  getDailySales: () => api.get('/dashboard/daily-sales'),
  getCategorySales: () => api.get('/dashboard/category-sales'),
  getItemSales: () => api.get('/dashboard/item-sales'),
  getGraph: () => api.get('/dashboard/graph'),
};

// Inventory API
export const inventoryAPI = {
  getAll: (params) => api.get('/items', { params }),
  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
  archive: (id) => api.put(`/items/${id}/archive`),
  importExcel: (formData) => api.post('/items/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  exportExcel: () => api.get('/items/export/excel', { responseType: 'blob' }),
  exportPdf: () => api.get('/items/export/pdf', { responseType: 'blob' }),
  uploadImage: (id, formData) => api.post(`/items/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteImage: (id) => api.delete(`/items/${id}/image`),
};

// Receiving API
export const receivingAPI = {
  getAll: (params) => api.get('/receiving', { params }),
  getById: (id) => api.get(`/receiving/${id}`),
  create: (data) => api.post('/receiving', data),
  update: (id, data) => api.put(`/receiving/${id}`, data),
  print: (id) => api.get(`/receiving/${id}/print`, { responseType: 'blob' }),
};

// Sales/POS API
export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  create: (data) => api.post('/sales', data),
  voidTransaction: (id, data) => api.post(`/sales/${id}/void`, data),
};

// Reports API
export const reportsAPI = {
  getSales: (params) => api.get('/reports/sales', { params }),
  getItemSales: (params) => api.get('/reports/item-sales', { params }),
  getCategorySales: (params) => api.get('/reports/category-sales', { params }),
  getInventory: (params) => api.get('/reports/inventory', { params }),
  getReceiving: (params) => api.get('/reports/receiving', { params }),
  exportSalesPdf: (params) => api.get('/reports/sales/export/pdf', { params, responseType: 'blob' }),
  exportSalesExcel: (params) => api.get('/reports/sales/export/excel', { params, responseType: 'blob' }),
  exportInventoryPdf: (params) => api.get('/reports/inventory/export/pdf', { params, responseType: 'blob' }),
  exportInventoryExcel: (params) => api.get('/reports/inventory/export/excel', { params, responseType: 'blob' }),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
};

// Categories API
export const categoriesAPI = {
  getAll: (params) => api.get('/categories', { params }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Suppliers API
export const suppliersAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

// Audit Logs API
export const auditAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
  exportPdf: (params) => api.get('/audit-logs/export/pdf', { params, responseType: 'blob' }),
  exportExcel: (params) => api.get('/audit-logs/export/excel', { params, responseType: 'blob' }),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Activity API
export const activityAPI = {
  getActivity: (params) => api.get('/activity', { params }),
  getActiveUsers: () => api.get('/activity/active-users'),
  getSystemHealth: () => api.get('/activity/system-health'),
};

// Settings API
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getByKey: (key) => api.get(`/settings/${key}`),
  update: (key, data) => api.put(`/settings/${key}`, data),
  getCompanyInfo: () => api.get('/settings/company'),
  updateCompanyInfo: (data) => api.put('/settings/company', data),
};

export default api;
