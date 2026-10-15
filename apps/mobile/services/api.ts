import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Fallback logic for API URL based on platform
const getBaseUrl = (): string => {
  let url = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
  if (!url) {
    url = Platform.OS === 'android' ? 'http://10.0.2.2:4000/api/v1' : 'http://localhost:4000/api/v1';
  }
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    url = `${url}/api/v1`;
  }
  return url;
};

export const API_BASE_URL = getBaseUrl();

const TOKEN_KEY = 'vrpi_mobile_access_token';
const REFRESH_TOKEN_KEY = 'vrpi_mobile_refresh_token';

// In-memory fallback for environments without SecureStore
let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

export class MobileApiClient {
  static async setTokens(accessToken: string, refreshToken: string) {
    inMemoryAccessToken = accessToken;
    inMemoryRefreshToken = refreshToken;
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } catch {
      // In web or restricted preview, in-memory tokens are used
    }
  }

  static async getAccessToken(): Promise<string | null> {
    if (inMemoryAccessToken) return inMemoryAccessToken;
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      inMemoryAccessToken = token;
      return token;
    } catch {
      return null;
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    if (inMemoryRefreshToken) return inMemoryRefreshToken;
    try {
      const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      inMemoryRefreshToken = token;
      return token;
    } catch {
      return null;
    }
  }

  static async clearTokens() {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      // Ignore cleanup error
    }
  }

  static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-client-platform': 'mobile',
      ...(options.headers as any),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    let response: Response;

    try {
      response = await fetch(url, { ...options, headers });
    } catch (networkErr: any) {
      throw {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the HRMS server. Please check your network connection.',
      };
    }

    // Handle token expiry: attempt refresh via dedicated mobile endpoint
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      const refreshToken = await this.getRefreshToken();
      if (refreshToken && !endpoint.includes('/auth/mobile/refresh')) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/mobile/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          const refreshData = await refreshRes.json();
          if (refreshRes.ok && refreshData.success) {
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

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw data.error || { code: 'SERVER_ERROR', message: 'An error occurred' };
    }

    return data.data;
  }

  static get<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static post<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}
