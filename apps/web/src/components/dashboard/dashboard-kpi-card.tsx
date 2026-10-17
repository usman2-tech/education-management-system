'use client';

/**
 * MODULE: Institutional KPI Card Component
 *
 * PURPOSE:
 * Standardized institutional summary card for real database counts, rates,
 * and key performance indicators.
 */

import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  colorScheme?: 'primary' | 'success' | 'warning' | 'info' | 'neutral';
}

export function DashboardKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
  colorScheme = 'primary',
}: KpiCardProps) {
  const colorStyles = {
    primary: {
      bg: 'bg-primary/5 dark:bg-primary/10',
      border: 'border-primary/20',
      iconBg: 'bg-primary/10 text-primary dark:bg-primary/20',
    },
    success: {
      bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    warning: {
      bg: 'bg-amber-500/5 dark:bg-amber-500/10',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    info: {
      bg: 'bg-blue-500/5 dark:bg-blue-500/10',
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    neutral: {
      bg: 'bg-card',
      border: 'border-border',
      iconBg: 'bg-muted text-muted-foreground',
    },
  };

  const currentStyle = colorStyles[colorScheme] || colorStyles.neutral;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${currentStyle.border} ${currentStyle.bg} p-5 shadow-sm transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {value}
            </h3>
            {badge && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}

          {trend && (
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <span
                className={`inline-flex items-center font-medium ${
                  trend.isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
                )}
                {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
              </span>
              {trend.label && (
                <span className="text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        <div className={`rounded-xl p-3 shadow-inner ${currentStyle.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
