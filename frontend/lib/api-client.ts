import { ApiResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    let token = localStorage.getItem('accessToken');
    if (!token) {
      const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
        const [key, value] = cookie.split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      token = cookies.accessToken || null;
    }
    return token;
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    let token = localStorage.getItem('refreshToken');
    if (!token) {
      const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
        const [key, value] = cookie.split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      token = cookies.refreshToken || null;
    }
    return token;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}/user/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const { accessToken, refreshToken: newRefreshToken } = data.data;
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            document.cookie = `accessToken=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
            document.cookie = `refreshToken=${newRefreshToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
          }
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requiresAuth: boolean = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const defaultHeaders: Record<string, string> = {};

    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const token = this.getAuthToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: { ...defaultHeaders, ...options.headers },
    };

    try {
      let response = await fetch(url, config);
      let data: any;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned ${response.status}: ${text.substring(0, 100)}`);
      }

      if (!response.ok && data?.message === "Invalid or expired token" && requiresAuth) {
        const refreshSuccess = await this.refreshToken();
        if (refreshSuccess) {
          const newToken = this.getAuthToken();
          if (newToken) {
            config.headers = { ...config.headers, 'Authorization': `Bearer ${newToken}` };
            response = await fetch(url, config);
            data = await response.json();
          }
        } else {
          this.clearAuth();
          throw new Error("Session expired. Please login again.");
        }
      }

      if (!response.ok) {
        const error: any = new Error(data.message || 'Request failed');
        error.errors = data.errors; // Attach detailed validation errors
        throw error;
      }

      return data;
    } catch (error) {

      throw error;
    }
  }

  clearAuth() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('ngo_profile');

      // Expire cookies
      const cookieOptions = "path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
      document.cookie = `accessToken=; ${cookieOptions}`;
      document.cookie = `refreshToken=; ${cookieOptions}`;
      document.cookie = `ngo_profile=; ${cookieOptions}`;
    }
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = this.getAuthToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Math.floor(Date.now() / 1000);
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();

export const postsApi = {
  getAll: () => apiClient.request<any[]>('/posts'),
  getById: (id: string) => apiClient.request<any>(`/posts/${id}`),
  create: (data: any) => apiClient.request<any>('/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  }, true),
};

export const donationsApi = {
  getAll: () => apiClient.request<any[]>('/donations'),
  getById: (id: string) => apiClient.request<any>(`/donations/${id}`),
  getByPost: (postId: string) => apiClient.request<any[]>(`/donations/post/${postId}`),
};
