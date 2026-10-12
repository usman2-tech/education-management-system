'use client';

/**
 * MODULE: Institutional Navigation Sidebar
 *
 * PURPOSE:
 * Provides role-aware, responsive navigation for all institutional management flows.
 * Supports expanded and collapsed states on desktop, and drawer navigation on mobile.
 */

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@ems/contracts';
import { ROLE_NAVIGATION } from '@/lib/navigation-config';
import {
  GraduationCap,
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  Sliders,
  Activity,
  Briefcase,
  UserCheck,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Megaphone,
  CheckSquare,
  Award,
  FileSpreadsheet,
  Sparkles,
  MessageSquare,
  Bot,
  Bell,
  ChevronLeft,
  ChevronRight,
  School,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  Sliders,
  Activity,
  GraduationCap,
  Briefcase,
  UserCheck,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Megaphone,
  CheckSquare,
  Award,
  FileSpreadsheet,
  Sparkles,
  MessageSquare,
  Bot,
  Bell,
};

export function Sidebar({
  currentRole,
  onRoleChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const navSections = ROLE_NAVIGATION[currentRole] || [];

  const roleLabels: Record<UserRole, string> = {
    [UserRole.PLATFORM_ADMIN]: 'Platform Admin',
    [UserRole.SCHOOL_ADMIN]: 'School Admin',
    [UserRole.TEACHER]: 'Teacher',
    [UserRole.STUDENT]: 'Student',
    [UserRole.PARENT]: 'Parent / Guardian',
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-hidden bg-sidebar text-sidebar-foreground">
      {/* Brand & Institution Header */}
      <div>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-sm">
              <School className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                  St. Jude Academy
                </div>
                <div className="text-xs text-sidebar-foreground/60">
                  Campus ID: #SCH-001
                </div>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role Selector Preview Bar */}
        <div className="border-b border-sidebar-border p-3">
          {!isCollapsed ? (
            <div>
              <label
                htmlFor="role-selector"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50"
              >
                Active Role View
              </label>
              <select
                id="role-selector"
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="w-full rounded-md border border-sidebar-border bg-sidebar-accent px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground outline-none focus:ring-1 focus:ring-sidebar-ring"
              >
                {Object.entries(roleLabels).map(([roleKey, label]) => (
                  <option key={roleKey} value={roleKey} className="bg-slate-900 text-white">
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex justify-center">
              <span
                title={roleLabels[currentRole]}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-accent text-[10px] font-bold text-sidebar-foreground"
              >
                {currentRole.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-6 overflow-y-auto px-2 py-4" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const IconComponent = ICON_MAP[item.icon] || LayoutDashboard;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    title={isCollapsed ? `${item.title}: ${item.description}` : undefined}
                    onClick={() => {
                      if (isMobileOpen) onCloseMobile();
                    }}
                    className={`group flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  >
                    <IconComponent className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-sidebar-foreground/70'}`} />
                    {!isCollapsed && (
                      <span className="flex-1 truncate">{item.title}</span>
                    )}
                    {!isCollapsed && item.badge && (
                      <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-semibold text-accent-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Collapse Toggle Footer */}
      <div className="hidden border-t border-sidebar-border p-3 md:block">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-sidebar-accent/50 px-2 py-1.5 text-xs text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside
        className={`hidden border-r border-sidebar-border transition-all duration-200 md:block ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 flex h-full w-72 flex-col shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
