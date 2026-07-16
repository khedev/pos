import { create } from 'zustand';
import { authAPI } from '@/lib/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(
    (typeof window !== 'undefined' ? localStorage.getItem('pgpos_user') : null) || 'null'
  ),
  token: typeof window !== 'undefined' ? localStorage.getItem('pgpos_token') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('pgpos_token') : false,
  isLoading: false,
  error: null,

  // SSR-compatible setters (used by AuthProvider during hydration)
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),

  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login({ email, password });
      const { user, token, refreshToken } = response.data;

      if (typeof window !== 'undefined') {
        localStorage.setItem('pgpos_token', token);
        localStorage.setItem('pgpos_user', JSON.stringify(user));

        // Set cookies for SSR — the server reads these on subsequent requests
        document.cookie = `pgpos_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
        document.cookie = `pgpos_user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;

        if (rememberMe) {
          localStorage.setItem('pgpos_refresh_token', refreshToken);
        }
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pgpos_token');
        localStorage.removeItem('pgpos_refresh_token');
        localStorage.removeItem('pgpos_user');

        // Clear auth cookies
        document.cookie = 'pgpos_token=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'pgpos_user=; path=/; max-age=0; SameSite=Lax';
      }

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
    const token = typeof window !== 'undefined' ? localStorage.getItem('pgpos_token') : null;
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('pgpos_user', JSON.stringify(response.data));
      }
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pgpos_token');
        localStorage.removeItem('pgpos_refresh_token');
        localStorage.removeItem('pgpos_user');
      }
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