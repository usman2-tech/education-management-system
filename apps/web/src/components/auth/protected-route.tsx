'use client';

/**
 * MODULE: Protected Route Guard
 *
 * PURPOSE:
 * Wraps pages requiring authentication or specific institutional roles.
 * Redirects unauthenticated users to /login and enforces role permissions.
 *
 * DEPENDENCIES:
 * useAuth, UserRole
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { ShieldAlert, ArrowLeft, Loader2, GraduationCap } from 'lucide-react';
import Link from 'next/link';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, effectiveRole } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary animate-pulse">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Verifying institutional credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Check role authorization if restricted
  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    effectiveRole !== UserRole.PLATFORM_ADMIN &&
    !allowedRoles.includes(effectiveRole)
  ) {
    return (
      <div className="mx-auto my-8 max-w-xl rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Access Restricted</h2>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Your current institutional role <span className="font-semibold text-foreground">[{effectiveRole}]</span> is
          not authorized to access this module. Authorized roles: [
          {allowedRoles.join(', ')}].
        </p>
        <div className="mt-5 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Main Portal</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
