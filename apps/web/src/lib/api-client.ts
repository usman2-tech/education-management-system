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

export interface ApiRequestOptions extends RequestInit {
  skipCache?: boolean;
  ttlMs?: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ApiClient {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private readonly DEFAULT_TTL_MS = 30_000; // 30 seconds default in-memory cache

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
    this.clearCache();
  }

  public clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private invalidateOnMutation(endpoint: string): void {
    const clean = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const domain = clean.split('/')[0]?.split('?')[0];
    if (domain) {
      this.clearCache(domain);
      this.clearCache('dashboard');
      this.clearCache('dashboards');
    } else {
      this.clearCache();
    }
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const signal = options.signal || controller.signal;

    try {
      const response = await fetch(url, {
        ...options,
        signal,
        headers,
      });
      clearTimeout(timeoutId);

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
      clearTimeout(timeoutId);
      if (err instanceof ApiError) {
        throw err;
      }
      if (err?.name === 'AbortError') {
        throw new ApiError(408, 'Institutional backend request timed out. Please verify service connectivity.');
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      const tokens: AuthTokens = data.tokens || data;
      this.setTokens(tokens);
      return true;
    } catch {
      clearTimeout(timeoutId);
      this.clearTokens();
      return false;
    }
  }

  public async get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    const skipCache = options?.skipCache ?? false;
    const ttlMs = options?.ttlMs ?? this.DEFAULT_TTL_MS;
    const token = this.getAccessToken() || 'anon';
    const cacheKey = `${token}::${endpoint}`;

    // 1. Check in-memory cache
    if (!skipCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
      }
    }

    // 2. Check in-flight request deduplication
    if (!skipCache && this.inFlight.has(cacheKey)) {
      return this.inFlight.get(cacheKey)!;
    }

    // 3. Dispatch request and track in-flight promise
    const promise = this.request<T>(endpoint, { ...options, method: 'GET' })
      .then((data) => {
        if (!skipCache) {
          this.cache.set(cacheKey, {
            data,
            expiresAt: Date.now() + ttlMs,
          });
        }
        return data;
      })
      .finally(() => {
        this.inFlight.delete(cacheKey);
      });

    if (!skipCache) {
      this.inFlight.set(cacheKey, promise);
    }

    return promise;
  }

  public async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const res = await this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    this.invalidateOnMutation(endpoint);
    return res;
  }

  public async put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const res = await this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    this.invalidateOnMutation(endpoint);
    return res;
  }

  public async patch<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const res = await this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    this.invalidateOnMutation(endpoint);
    return res;
  }

  public async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
    this.invalidateOnMutation(endpoint);
    return res;
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

