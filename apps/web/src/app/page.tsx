/**
 * MODULE: Institutional Dashboard Overview
 *
 * PURPOSE:
 * Landing workspace for the Educational Management System ERP.
 * Combines real-time infrastructure telemetry, role preview controls,
 * and institutional navigation cards.
 *
 * ZERO FABRICATION DIRECTIVE:
 * Does not show fabricated student counts or mock financial numbers as real.
 */

import { SystemStatusBadge } from '@/components/dashboard/system-status-badge';
import { RoleNavigationCard } from '@/components/dashboard/role-navigation-card';
import {
  School,
  Shield,
  Layers,
  Terminal,
  ExternalLink,
  BookMarked,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Institutional Banner */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary via-primary/95 to-primary/85 p-6 text-primary-foreground shadow-sm sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent-foreground backdrop-blur-sm">
              <School className="h-3.5 w-3.5" />
              Institutional Management System
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/90">
              Session 2026–2027
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            St. Jude Academy Central Administration
          </h1>

          <p className="mt-2 text-sm text-white/80 leading-relaxed max-w-2xl">
            Enterprise multi-school management portal. Governing academic programs,
            faculty coordination, student lifecycle records, examinations, and
            autonomous AI-guided learning assistance.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-white/70">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-accent" />
              <span>Multi-Tenant School Isolation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-accent" />
              <span>5 Authorized User Roles</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span>Task 001 Foundation Verified</span>
            </div>
          </div>
        </div>

        {/* Decorative institutional watermark */}
        <div className="absolute -bottom-8 -right-8 opacity-10 pointer-events-none">
          <School className="h-64 w-64 text-white" />
        </div>
      </div>

      {/* Live System Diagnostics */}
      <SystemStatusBadge />

      {/* Architecture & Domain Modules */}
      <RoleNavigationCard />

      {/* Engineering & Developer Verifications Quick Links */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">
              Developer Endpoints & API Telemetry
            </h3>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">
            Task 001 Operational Verification
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a
            href="http://localhost:4000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3 text-xs transition-colors hover:border-accent hover:bg-muted/40"
          >
            <div>
              <div className="font-semibold text-foreground">NestJS Swagger UI</div>
              <div className="text-[11px] text-muted-foreground">localhost:4000/api/docs</div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>

          <a
            href="http://localhost:4000/api/v1/health"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3 text-xs transition-colors hover:border-accent hover:bg-muted/40"
          >
            <div>
              <div className="font-semibold text-foreground">NestJS Health API</div>
              <div className="text-[11px] text-muted-foreground">localhost:4000/api/v1/health</div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3 text-xs transition-colors hover:border-accent hover:bg-muted/40"
          >
            <div>
              <div className="font-semibold text-foreground">FastAPI AI Swagger</div>
              <div className="text-[11px] text-muted-foreground">localhost:8000/docs</div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>

          <a
            href="http://localhost:8000/health"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3 text-xs transition-colors hover:border-accent hover:bg-muted/40"
          >
            <div>
              <div className="font-semibold text-foreground">FastAPI AI Health</div>
              <div className="text-[11px] text-muted-foreground">localhost:8000/health</div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        </div>
      </div>
    </div>
  );
}
