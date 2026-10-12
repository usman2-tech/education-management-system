'use client';

/**
 * MODULE: System Component Status Badge & Observability Card
 *
 * PURPOSE:
 * Displays real-time operational status of the core NestJS backend,
 * PostgreSQL database, Redis cache, and AI microservice.
 *
 * ZERO FABRICATION DIRECTIVE:
 * Strictly polls real health data from /api/v1/health. No hardcoded mock statuses.
 */

import * as React from 'react';
import { fetchSystemHealth } from '@/lib/api-client';
import { SystemHealthResponse } from '@ems/contracts';
import { Database, Server, Cpu, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export function SystemStatusBadge() {
  const [health, setHealth] = React.useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [lastChecked, setLastChecked] = React.useState<string>('');

  const checkHealth = React.useCallback(async () => {
    setLoading(true);
    const data = await fetchSystemHealth();
    setHealth(data);
    setLastChecked(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [checkHealth]);

  const dbStatus = health?.services?.database?.status || 'down';
  const redisStatus = health?.services?.redis?.status || 'down';
  const aiStatus = health?.services?.aiService?.status || 'down';

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Core Infrastructure Health
            </h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                health?.status === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : health?.status === 'degraded'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {health?.status === 'ok' ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  All Systems Operational
                </>
              ) : health?.status === 'degraded' ? (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  Degraded Observability
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" />
                  Offline / Disconnected
                </>
              )}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Real-time diagnostics from NestJS API (Port 4000) &bull; Verified via heartbeat
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-[11px] text-muted-foreground">
              Checked: {lastChecked}
            </span>
          )}
          <button
            type="button"
            onClick={checkHealth}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            aria-label="Refresh infrastructure status"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-3">
        {/* PostgreSQL Database */}
        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Database className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">PostgreSQL</span>
              <span
                className={`text-[10px] font-bold uppercase ${
                  dbStatus === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                }`}
              >
                {dbStatus}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {health?.services?.database?.latencyMs !== undefined
                ? `${health.services.database.latencyMs}ms query latency`
                : 'Port 5432 / Prisma'}
            </p>
          </div>
        </div>

        {/* Redis Cache */}
        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
            <Server className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Redis Cache</span>
              <span
                className={`text-[10px] font-bold uppercase ${
                  redisStatus === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                }`}
              >
                {redisStatus}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {health?.services?.redis?.latencyMs !== undefined
                ? `${health.services.redis.latencyMs}ms TCP latency`
                : 'Port 6379 / BullMQ'}
            </p>
          </div>
        </div>

        {/* AI Microservice */}
        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Cpu className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">FastAPI AI</span>
              <span
                className={`text-[10px] font-bold uppercase ${
                  aiStatus === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600'
                }`}
              >
                {aiStatus}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {health?.services?.aiService?.latencyMs !== undefined
                ? `${health.services.aiService.latencyMs}ms HTTP latency`
                : 'Port 8000 / LangGraph'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
