'use client';

/**
 * MODULE: Institutional Authentication Context
 *
 * PURPOSE:
 * Central React state provider managing authentication session tokens,
 * current user profile, institutional tenant scope, and role preview capabilities.
 *
 * DEPENDENCIES:
 * @ems/contracts, apiClient
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AuthUser, AuthResponse, UserRole } from '@ems/contracts';
import { apiClient } from '@/lib/api-client';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  effectiveRole: UserRole;
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
  login: (email: string, pass: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [previewRole, setPreviewRole] = React.useState<UserRole | null>(null);

  // Initialize session from localStorage and verify against /auth/me
  React.useEffect(() => {
    async function initAuth() {
      try {
        const storedUser = localStorage.getItem('ems_user');
        const token = localStorage.getItem('ems_access_token');

        if (storedUser && token) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // Invalid JSON in localStorage
          }

          // Verify with live backend
          const meUser = await apiClient.get<AuthUser>('/auth/me');
          setUser(meUser);
          localStorage.setItem('ems_user', JSON.stringify(meUser));
        }
      } catch (err) {
        console.warn('Session verification failed:', err);
        apiClient.clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = React.useCallback(
    async (email: string, pass: string): Promise<AuthUser> => {
      setIsLoading(true);
      try {
        const res = await apiClient.post<AuthResponse>('/auth/login', {
          email,
          password: pass,
        });

        apiClient.setTokens(res.tokens);
        setUser(res.user);
        setPreviewRole(null);
        localStorage.setItem('ems_user', JSON.stringify(res.user));
        return res.user;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = React.useCallback(async () => {
    try {
      await apiClient.post('/auth/logout').catch(() => {});
    } finally {
      apiClient.clearTokens();
      setUser(null);
      setPreviewRole(null);
      router.push('/login');
    }
  }, [router]);

  const refreshProfile = React.useCallback(async () => {
    try {
      const meUser = await apiClient.get<AuthUser>('/auth/me');
      setUser(meUser);
      localStorage.setItem('ems_user', JSON.stringify(meUser));
    } catch {
      await logout();
    }
  }, [logout]);

  const effectiveRole: UserRole =
    previewRole || user?.role || UserRole.SCHOOL_ADMIN;

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      effectiveRole,
      previewRole,
      setPreviewRole,
      login,
      logout,
      refreshProfile,
    }),
    [
      user,
      isLoading,
      effectiveRole,
      previewRole,
      setPreviewRole,
      login,
      logout,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
