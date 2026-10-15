import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Fallback logic for API URL based on platform and Expo development host
const computeDefaultBaseUrl = (): string => {
  let url = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
  if (url) {
    url = url.replace(/\/+$/, '');
    return url.endsWith('/api/v1') ? url : `${url}/api/v1`;
  }

  // If running via Expo Go / development client, derive LAN IP from debuggerHost
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost && typeof debuggerHost === 'string') {
    const host = debuggerHost.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:4000/api/v1`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api/v1';
  }

  return 'http://localhost:4000/api/v1';
};

export let API_BASE_URL = computeDefaultBaseUrl();

const SERVER_URL_KEY = 'vrpi_mobile_custom_server_url';
let customApiBaseUrl: string | null = null;

export const getApiBaseUrl = (): string => {
  return customApiBaseUrl || API_BASE_URL;
};

export const setApiBaseUrl = async (newUrl: string) => {
  let formatted = newUrl.trim().replace(/\/+$/, '');
  if (!formatted.endsWith('/api/v1')) {
    formatted = `${formatted}/api/v1`;
  }
  customApiBaseUrl = formatted;
  API_BASE_URL = formatted;
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(SERVER_URL_KEY, formatted);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SERVER_URL_KEY, formatted);
    }
  } catch {
    // Ignore storage errors
  }
};

export const loadStoredApiBaseUrl = async (): Promise<string> => {
  try {
    let stored: string | null = null;
    if (Platform.OS !== 'web') {
      stored = await SecureStore.getItemAsync(SERVER_URL_KEY);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      stored = window.localStorage.getItem(SERVER_URL_KEY);
    }
    if (stored) {
      let formatted = stored.trim().replace(/\/+$/, '');
      if (!formatted.endsWith('/api/v1')) {
        formatted = `${formatted}/api/v1`;
      }
      customApiBaseUrl = formatted;
      API_BASE_URL = formatted;
      return formatted;
    }
  } catch {
    // fallback
  }
  return API_BASE_URL;
};

const TOKEN_KEY = 'vrpi_mobile_access_token';
const REFRESH_TOKEN_KEY = 'vrpi_mobile_refresh_token';
const USER_KEY = 'vrpi_mobile_cached_user';

// In-memory fallback for environments without SecureStore or web
let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;
let inMemoryCachedUser: any | null = null;

export class MobileApiClient {
  static async setTokens(accessToken: string, refreshToken: string) {
    inMemoryAccessToken = accessToken;
    inMemoryRefreshToken = refreshToken;
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(TOKEN_KEY, accessToken);
        window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    } catch {
      // In-memory fallback is active
    }
  }

  static async getAccessToken(): Promise<string | null> {
    if (inMemoryAccessToken) return inMemoryAccessToken;
    try {
      if (Platform.OS !== 'web') {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        inMemoryAccessToken = token;
        return token;
      } else if (typeof window !== 'undefined' && window.localStorage) {
        const token = window.localStorage.getItem(TOKEN_KEY);
        inMemoryAccessToken = token;
        return token;
      }
    } catch {
      return null;
    }
    return null;
  }

  static async getRefreshToken(): Promise<string | null> {
    if (inMemoryRefreshToken) return inMemoryRefreshToken;
    try {
      if (Platform.OS !== 'web') {
        const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        inMemoryRefreshToken = token;
        return token;
      } else if (typeof window !== 'undefined' && window.localStorage) {
        const token = window.localStorage.getItem(REFRESH_TOKEN_KEY);
        inMemoryRefreshToken = token;
        return token;
      }
    } catch {
      return null;
    }
    return null;
  }

  static async saveCachedUser(user: any) {
    inMemoryCachedUser = user;
    try {
      const serialized = JSON.stringify(user);
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(USER_KEY, serialized);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(USER_KEY, serialized);
      }
    } catch {
      // Ignore serialization issues
    }
  }

  static async getCachedUser(): Promise<any | null> {
    if (inMemoryCachedUser) return inMemoryCachedUser;
    try {
      let raw: string | null = null;
      if (Platform.OS !== 'web') {
        raw = await SecureStore.getItemAsync(USER_KEY);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(USER_KEY);
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        inMemoryCachedUser = parsed;
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  }

  static async clearTokens() {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;
    inMemoryCachedUser = null;
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
      }
    } catch {
      // Ignore cleanup error
    }
  }

  static async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 8000
  ): Promise<T> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-client-platform': 'mobile',
      ...(options.headers as any),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${getApiBaseUrl()}${endpoint}`;
    let response: Response;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (networkErr: any) {
      if (networkErr.name === 'AbortError') {
        throw {
          code: 'NETWORK_TIMEOUT',
          message: 'Connection timed out. Please check if the HRMS backend server is running.',
        };
      }
      throw {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the HRMS server. Please check your network connection.',
      };
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle token expiry: attempt refresh via dedicated mobile endpoint
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      const refreshToken = await this.getRefreshToken();
      if (refreshToken && !endpoint.includes('/auth/mobile/refresh')) {
        try {
          const refreshRes = await fetch(`${getApiBaseUrl()}/auth/mobile/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          let refreshData: any = null;
          try {
            refreshData = await refreshRes.json();
          } catch {
            refreshData = null;
          }

          if (refreshRes.ok && refreshData?.success) {
            await this.setTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
            headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
            // Retry original request
            response = await fetch(url, { ...options, headers });
          } else {
            await this.clearTokens();
          }
        } catch {
          await this.clearTokens();
        }
      }
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw {
        code: 'PARSE_ERROR',
        message: `Invalid server response (HTTP ${response.status}). Expected JSON.`,
      };
    }

    if (!response.ok || !data.success) {
      throw data.error || { code: 'SERVER_ERROR', message: data.message || 'An error occurred' };
    }

    return data.data;
  }

  static get<T = any>(endpoint: string, timeoutMs?: number) {
    return this.request<T>(endpoint, { method: 'GET' }, timeoutMs);
  }

  static post<T = any>(endpoint: string, body?: any, timeoutMs?: number) {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      timeoutMs
    );
  }
}
