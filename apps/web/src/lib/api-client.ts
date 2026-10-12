/**
 * MODULE: Institutional API Client
 *
 * PURPOSE:
 * Centralized, typed HTTP client wrapper for NestJS API communication.
 * Manages Bearer token injection, automatic refresh token rotation, and error serialization.
 *
 * DEPENDENCIES:
 * @ems/contracts
 */

import { AuthResponse, AuthTokens, UserProfileResponse, SystemHealthResponse } from '@ems/contracts';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('ems_access_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('ems_refresh_token');
  }

  public setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ems_access_token', tokens.accessToken);
    localStorage.setItem('ems_refresh_token', tokens.refreshToken);
  }

  public clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('ems_access_token');
    localStorage.removeItem('ems_refresh_token');
    localStorage.removeItem('ems_user');
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false,
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized for token refresh
      if (response.status === 401 && !isRetry && !endpoint.includes('/auth/login')) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          return this.request<T>(endpoint, options, true);
        }
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new ApiError(
          response.status,
          data?.message || `Request failed with status ${response.status}`,
          data?.errors,
        );
      }

      return data as T;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(500, err?.message || 'Network connection error.');
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearTokens();
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const tokens: AuthTokens = await response.json();
      this.setTokens(tokens);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  public get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiClient = new ApiClient();

export async function fetchSystemHealth(): Promise<SystemHealthResponse | null> {
  try {
    return await apiClient.get<SystemHealthResponse>('/health');
  } catch {
    return null;
  }
}

