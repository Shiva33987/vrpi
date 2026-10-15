import { create } from 'zustand';
import { MobileApiClient } from '../services/api';

export interface MobileUserState {
  id: string;
  email: string;
  role: string;
  organization: {
    id: string;
    name: string;
    code: string;
    timezone: string;
  };
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    phone?: string;
    joiningDate?: string;
    department?: { id: string; name: string };
    designation?: { id: string; title: string };
    manager?: { id: string; firstName: string; lastName: string; email: string };
  };
}

interface MobileAuthStore {
  user: MobileUserState | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
  login: (email: string, password: string, organizationCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setOffline: (offline: boolean) => void;
  clearError: () => void;
}

export const useMobileAuthStore = create<MobileAuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isOffline: false,
  error: null,

  login: async (email, password, organizationCode) => {
    set({ isLoading: true, error: null });
    try {
      const data = await MobileApiClient.post('/auth/login', {
        email: email.trim(),
        password,
        organizationCode: organizationCode?.trim().toUpperCase(),
      });

      await MobileApiClient.setTokens(data.accessToken, data.refreshToken);

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        isOffline: false,
        error: null,
      });
    } catch (err: any) {
      set({
        error: err.message || 'Login failed. Please check your credentials.',
        isLoading: false,
      });
      throw err;
    }
  },

  logout: async () => {
    try {
      const refreshToken = await MobileApiClient.getRefreshToken();
      await MobileApiClient.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore network errors on logout
    } finally {
      await MobileApiClient.clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await MobileApiClient.getAccessToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const user = await MobileApiClient.get('/auth/me');
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isOffline: false,
      });
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        // App opened offline
        set({ isOffline: true, isLoading: false });
      } else {
        await MobileApiClient.clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
  },

  setOffline: (offline: boolean) => set({ isOffline: offline }),
  clearError: () => set({ error: null }),
}));
