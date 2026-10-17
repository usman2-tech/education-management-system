/**
 * MODULE: Institutional Route Transition Loading Boundary
 *
 * PURPOSE:
 * Automatic Next.js App Router suspense fallback rendered during route transitions.
 * Keeps the sidebar, header, and shell persistent while streaming the requested module.
 */

import React from 'react';
import { DashboardSkeleton } from '@/components/ui/skeleton';

export default function RootLoading() {
  return <DashboardSkeleton />;
}
