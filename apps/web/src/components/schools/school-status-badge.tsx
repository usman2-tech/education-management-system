/**
 * MODULE: School Status Badge Component
 *
 * PURPOSE:
 * Visual status pill indicating active, inactive, or suspended status of an institutional tenant.
 *
 * DEPENDENCIES:
 * SchoolStatus from @ems/contracts
 */

import * as React from 'react';
import { SchoolStatus } from '@ems/contracts';

interface SchoolStatusBadgeProps {
  status: SchoolStatus;
  size?: 'sm' | 'md';
}

export function SchoolStatusBadge({ status, size = 'sm' }: SchoolStatusBadgeProps) {
  const configs: Record<
    SchoolStatus,
    { label: string; badgeClass: string; dotClass: string }
  > = {
    [SchoolStatus.ACTIVE]: {
      label: 'Active Institutional Tenant',
      badgeClass:
        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
      dotClass: 'bg-emerald-500 animate-pulse',
    },
    [SchoolStatus.INACTIVE]: {
      label: 'Deactivated / Inactive',
      badgeClass:
        'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
      dotClass: 'bg-rose-500',
    },
    [SchoolStatus.SUSPENDED]: {
      label: 'Suspended Audit Hold',
      badgeClass:
        'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      dotClass: 'bg-amber-500',
    },
    [SchoolStatus.PENDING_VERIFICATION]: {
      label: 'Pending Verification',
      badgeClass:
        'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
      dotClass: 'bg-blue-500',
    },
  };

  const config = configs[status] || configs[SchoolStatus.ACTIVE];
  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses} ${config.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      <span>{config.label}</span>
    </span>
  );
}
