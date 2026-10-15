import { create } from 'zustand';
import { ApiClient } from '../services/api';
import { UserRole } from '@vrpi-hrms/shared';

export interface UserState {
  id: string;
  email: string;
  role: UserRole;
  organization: {
    id: string;
    name: string;
    code: string;
    timezone: string;
    currency: string;
  };
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    department?: { id: string; name: string; code: string } | null;
    designation?: { id: string; title: string } | null;
  } | null;
}

interface AuthStore {
  user: UserState | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, organizationCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password, organizationCode) => {
    set({ isLoading: true, error: null });
    try {
      const data = await ApiClient.post('/auth/login', {
        email,
        password,
        organizationCode,
      });

      ApiClient.setToken(data.accessToken);
      localStorage.setItem('vrpi_access_token', data.accessToken);

      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      set({
        error: err.message || 'Authentication failed. Please check your credentials.',
        isLoading: false,
      });
      throw err;
    }
  },

  logout: async () => {
    try {
      await ApiClient.post('/auth/logout', {});
    } catch {
      // Ignore logout errors
    } finally {
      ApiClient.setToken(null);
      localStorage.removeItem('vrpi_access_token');
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    const storedToken = localStorage.getItem('vrpi_access_token');

    if (storedToken) {
      ApiClient.setToken(storedToken);
      try {
        const user = await ApiClient.get('/auth/me');
        set({
          user,
          accessToken: storedToken,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      } catch {
        // Token expired or invalid, try cookie refresh
      }
    }

    // Try refreshing via HttpOnly cookie
    try {
      const refreshData = await ApiClient.post('/auth/refresh', {});
      ApiClient.setToken(refreshData.accessToken);
      localStorage.setItem('vrpi_access_token', refreshData.accessToken);

      const user = await ApiClient.get('/auth/me');
      set({
        user,
        accessToken: refreshData.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      ApiClient.setToken(null);
      localStorage.removeItem('vrpi_access_token');
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
