// API Client for RentFlow Backend
// This client handles all communication with the rentflow-backend API

import { supabase } from './supabase';
import { getCSRFToken } from './authSecurity';

// Backend API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Enable/disable backend API usage
const USE_BACKEND_API = import.meta.env.VITE_USE_BACKEND_API === 'true';

export interface ApiClientConfig {
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  status: number;
}

/**
 * API Client class for making requests to the backend
 */
class ApiClient {
  private baseURL: string;
  private defaultTimeout: number = 30000; // 30 seconds

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Get authentication token from Supabase session
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Build headers for API requests
   */
  private async buildHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      ...customHeaders,
    };

    // Add authentication token if available
    const token = await this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // ✅ Add CSRF token if available using utility function
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    return headers;
  }

  /**
   * Make a generic API request
   */
  private async request<T = unknown>(
    endpoint: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const timeout = options.timeout || this.defaultTimeout;

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Build headers
      const headers = await this.buildHeaders(options.headers as Record<string, string>);

      // Make request
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      let data: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle error responses
      if (!response.ok) {
        const errorData = data as { error?: string; message?: string; code?: string };
        return {
          data: undefined,
          error: {
            message: errorData?.error || errorData?.message || 'Request failed',
            code: errorData?.code,
            details: data as Record<string, unknown>,
          },
          status: response.status,
        };
      }

      return {
        data: data as T,
        error: undefined,
        status: response.status,
      };
    } catch (error: unknown) {
      // Handle network errors, timeouts, etc.
      const err = error as Error & { name?: string };
      if (err.name === 'AbortError') {
        return {
          data: undefined,
          error: {
            message: 'Request timeout',
            code: 'TIMEOUT',
          },
          status: 408,
        };
      }

      return {
        data: undefined,
        error: {
          message: err.message || 'Network error',
          code: 'NETWORK_ERROR',
          details: { error: err },
        },
        status: 0,
      };
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(endpoint: string, config?: ApiClientConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      ...config,
    });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: ApiClientConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: ApiClientConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: ApiClientConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(endpoint: string, config?: ApiClientConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...config,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export flag to check if backend API should be used
export const useBackendAPI = USE_BACKEND_API;

// Helper function to determine if we should use backend or direct Supabase
export const shouldUseBackend = (): boolean => {
  return USE_BACKEND_API && API_BASE_URL && API_BASE_URL !== '';
};
