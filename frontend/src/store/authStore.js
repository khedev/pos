import { create } from 'zustand';
import { authAPI } from '@/lib/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('pgpos_user') || 'null'),
  token: localStorage.getItem('pgpos_token') || null,
  isAuthenticated: !!localStorage.getItem('pgpos_token'),
  isLoading: false,
  error: null,

  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login({ email, password });
      const { user, token, refreshToken } = response.data;

      localStorage.setItem('pgpos_token', token);
      localStorage.setItem('pgpos_user', JSON.stringify(user));

      if (rememberMe) {
        localStorage.setItem('pgpos_refresh_token', refreshToken);
      }

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('pgpos_token');
      localStorage.removeItem('pgpos_refresh_token');
      localStorage.removeItem('pgpos_user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('pgpos_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      const response = await authAPI.me();
      set({
        user: response.data,
        isAuthenticated: true,
      });
      localStorage.setItem('pgpos_user', JSON.stringify(response.data));
    } catch (error) {
      localStorage.removeItem('pgpos_token');
      localStorage.removeItem('pgpos_refresh_token');
      localStorage.removeItem('pgpos_user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;