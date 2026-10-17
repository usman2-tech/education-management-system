'use client';

/**
 * MODULE: Institutional Dashboard Shell
 *
 * PURPOSE:
 * Core layout coordinator managing sidebar collapse states, mobile drawers,
 * route protection, and authentication-aware role contextualization across the portal.
 */

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { ProtectedRoute } from '@/components/auth/protected-route';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const { effectiveRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState<boolean>(false);

  const handleToggleCollapse = React.useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const handleCloseMobile = React.useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const handleOpenMobile = React.useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  // Standalone authentication and activation pages bypass shell scaffolding
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/activate';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        {/* Role-Aware Sidebar */}
        <Sidebar
          currentRole={effectiveRole}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          isMobileOpen={isMobileOpen}
          onCloseMobile={handleCloseMobile}
        />

        {/* Main Content Viewport */}
        <div className="flex flex-1 flex-col overflow-x-hidden">
          <Header
            currentRole={effectiveRole}
            onOpenMobileNav={handleOpenMobile}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>

          {/* Institutional Footer */}
          <footer className="border-t border-border bg-card/50 px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
            Educational Management System &bull; Version 0.1.0 &bull; Multi-Tenant Academic ERP
          </footer>
        </div>
      </div>
    </ProtectedRoute>
  );
}
