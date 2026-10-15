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
      await MobileApiClient.saveCachedUser(data.user);

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
      await MobileApiClient.post('/auth/logout', { refreshToken }, 3000);
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
      const cachedUser = await MobileApiClient.getCachedUser();

      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // If cached profile exists, pre-load it
      if (cachedUser) {
        set({ user: cachedUser, isAuthenticated: true });
      }

      try {
        const user = await MobileApiClient.get('/auth/me', 4000);
        await MobileApiClient.saveCachedUser(user);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isOffline: false,
        });
      } catch (err: any) {
        if (err.code === 'NETWORK_ERROR' || err.code === 'NETWORK_TIMEOUT') {
          // App opened offline or backend is temporarily unreachable
          set({
            user: cachedUser || null,
            isAuthenticated: !!cachedUser,
            isOffline: true,
            isLoading: false,
          });
        } else {
          // Authentication invalid or expired
          await MobileApiClient.clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setOffline: (offline: boolean) => set({ isOffline: offline }),
  clearError: () => set({ error: null }),
}));
