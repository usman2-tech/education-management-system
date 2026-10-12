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
  const { effectiveRole, setPreviewRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState<boolean>(false);

  // Standalone authentication page bypasses shell scaffolding
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        {/* Role-Aware Sidebar */}
        <Sidebar
          currentRole={effectiveRole}
          onRoleChange={setPreviewRole}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        {/* Main Content Viewport */}
        <div className="flex flex-1 flex-col overflow-x-hidden">
          <Header
            currentRole={effectiveRole}
            onOpenMobileNav={() => setIsMobileOpen(true)}
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
