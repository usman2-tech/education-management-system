'use client';

/**
 * MODULE: Top Application Header
 *
 * PURPOSE:
 * Provides global navigation actions, breadcrumb hierarchy, search input,
 * notification indicators, theme toggling, and user profile summary.
 */

import * as React from 'react';
import { Menu, Search, Bell, User, CheckCircle2, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserRole } from '@ems/contracts';

interface HeaderProps {
  currentRole: UserRole;
  onOpenMobileNav: () => void;
}

export function Header({ currentRole, onOpenMobileNav }: HeaderProps) {
  const roleDisplayNames: Record<UserRole, string> = {
    [UserRole.PLATFORM_ADMIN]: 'System Administrator',
    [UserRole.SCHOOL_ADMIN]: 'Principal / Registrar',
    [UserRole.TEACHER]: 'Faculty Member',
    [UserRole.STUDENT]: 'Enrolled Student',
    [UserRole.PARENT]: 'Verified Parent',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:px-6">
      {/* Left: Mobile Nav Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">St. Jude Academy</span>
          <span className="text-muted-foreground">/</span>
          <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary">
            Session 2026-2027
          </span>
          <span className="hidden text-muted-foreground sm:inline">/</span>
          <span className="hidden text-muted-foreground sm:inline">Management Console</span>
        </div>
      </div>

      {/* Center/Right: Search, Notifications, Theme, Profile */}
      <div className="flex items-center gap-3">
        {/* Global Search Bar */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search students, staff, classes (Ctrl+K)..."
            className="h-9 w-64 rounded-lg border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring lg:w-80"
          />
        </div>

        {/* Theme Switcher */}
        <ThemeToggle />

        {/* Notifications Icon */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="View system notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
        </button>

        {/* User Profile Avatar / Summary */}
        <div className="flex items-center gap-2.5 border-l border-border pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs shadow-sm">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden text-left lg:block">
            <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
              <span>Dr. Eleanor Vance</span>
              <Shield className="h-3 w-3 text-accent" />
            </div>
            <div className="text-[11px] text-muted-foreground">
              {roleDisplayNames[currentRole]}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
