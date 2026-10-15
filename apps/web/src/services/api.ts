// Base URL resolution: use relative /api/v1 for seamless Vite dev proxy, or environment override
const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    return '/api/v1';
  }
  return 'http://127.0.0.1:4000/api/v1';
};

const API_BASE_URL = getBaseUrl();

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiClient {
  private static token: string | null = null;

  static setToken(token: string | null) {
    this.token = token;
  }

  static getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('vrpi_access_token');
    }
    return this.token;
  }

  static async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, ...customConfig } = options;

    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined) searchParams.append(key, String(val));
      });
      const queryStr = searchParams.toString();
      if (queryStr) url += `?${queryStr}`;
    }

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    const authToken = this.getToken();
    if (authToken) {
      defaultHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const config: RequestInit = {
      ...customConfig,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
      credentials: 'include', // for HttpOnly refresh cookie
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (networkErr: any) {
      throw {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the HRMS server. Please verify backend service is running.',
      };
    }

    // Auto-refresh token if 401 is received on an authenticated endpoint
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        const refreshData = await refreshRes.json();
        if (refreshRes.ok && refreshData.success) {
          this.setToken(refreshData.data.accessToken);
          localStorage.setItem('vrpi_access_token', refreshData.data.accessToken);

          // Retry original request with fresh token
          const retryHeaders = {
            ...config.headers,
            Authorization: `Bearer ${refreshData.data.accessToken}`,
          };
          response = await fetch(url, { ...config, headers: retryHeaders });
        }
      } catch {
        // Fall through to error handler
      }
    }

    // Handle CSV or file blob responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      if (!response.ok) throw new Error('Failed to fetch CSV');
      return (await response.text()) as unknown as T;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      const error = data.error || {
        code: 'UNKNOWN_ERROR',
        message: response.statusText || 'An unexpected server error occurred',
      };
      throw error;
    }

    return data.data;
  }

  static get<T = any>(endpoint: string, params?: Record<string, any>) {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  static post<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  static put<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  static delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
