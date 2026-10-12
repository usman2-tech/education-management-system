/**
 * MODULE: Teacher Status Badge Component
 *
 * PURPOSE:
 * Displays visual badges for active/inactive user status and institutional employment statuses.
 *
 * DEPENDENCIES:
 * TeacherEmploymentStatus from @ems/contracts
 */

import * as React from 'react';
import { TeacherEmploymentStatus } from '@ems/contracts';

interface TeacherStatusBadgeProps {
  isActive: boolean;
  employmentStatus?: TeacherEmploymentStatus | null;
  size?: 'sm' | 'md';
}

export function TeacherStatusBadge({
  isActive,
  employmentStatus = TeacherEmploymentStatus.ACTIVE,
  size = 'sm',
}: TeacherStatusBadgeProps) {
  if (!isActive) {
    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses} bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        <span>Deactivated User</span>
      </span>
    );
  }

  const configs: Record<
    TeacherEmploymentStatus,
    { label: string; badgeClass: string; dotClass: string }
  > = {
    [TeacherEmploymentStatus.ACTIVE]: {
      label: 'Active Faculty',
      badgeClass:
        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
      dotClass: 'bg-emerald-500 animate-pulse',
    },
    [TeacherEmploymentStatus.ON_LEAVE]: {
      label: 'On Sabbatical / Leave',
      badgeClass:
        'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
      dotClass: 'bg-blue-500',
    },
    [TeacherEmploymentStatus.SUSPENDED]: {
      label: 'Administrative Suspension',
      badgeClass:
        'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      dotClass: 'bg-amber-500',
    },
    [TeacherEmploymentStatus.TERMINATED]: {
      label: 'Employment Terminated',
      badgeClass:
        'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
      dotClass: 'bg-slate-500',
    },
  };

  const statusKey = employmentStatus || TeacherEmploymentStatus.ACTIVE;
  const config = configs[statusKey] || configs[TeacherEmploymentStatus.ACTIVE];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses} ${config.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      <span>{config.label}</span>
    </span>
  );
}
