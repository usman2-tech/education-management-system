'use client';

/**
 * MODULE: Institutional Dashboard Shell
 *
 * PURPOSE:
 * Core layout coordinator managing sidebar collapse states, mobile drawers,
 * and role-preview switching across the portal.
 */

import * as React from 'react';
import { UserRole } from '@ems/contracts';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [currentRole, setCurrentRole] = React.useState<UserRole>(
    UserRole.PLATFORM_ADMIN,
  );
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState<boolean>(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Role-Aware Sidebar */}
      <Sidebar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Header
          currentRole={currentRole}
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
  );
}
