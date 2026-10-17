'use client';

/**
 * MODULE: Institutional Schools Directory
 *
 * PURPOSE:
 * Displays institutional school tenants with real-time database search,
 * status filtering, pagination, and administrative lifecycle actions.
 *
 * ZERO FABRICATION DIRECTIVE:
 * Displays real counts and database-persisted schools.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SchoolDto, SchoolStatus, UserRole } from '@ems/contracts';
import { fetchSchools, updateSchoolStatus } from '@/lib/schools-api';
import { SchoolStatusBadge } from '@/components/schools/school-status-badge';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Users,
  GraduationCap,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Power,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export default function SchoolsPage() {
  const router = useRouter();
  const { user, effectiveRole } = useAuth();
  const isPlatformAdmin = effectiveRole === UserRole.PLATFORM_ADMIN;

  const [schools, setSchools] = React.useState<SchoolDto[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(1);
  const [limit] = React.useState<number>(10);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Status toggle confirmation modal state
  const [targetSchool, setTargetSchool] = React.useState<SchoolDto | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState<boolean>(false);

  const loadSchools = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchSchools({
        page,
        limit,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as SchoolStatus) : undefined,
      });
      setSchools(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load institutional schools.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  React.useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const handleStatusToggle = async () => {
    if (!targetSchool) return;
    setIsUpdatingStatus(true);
    const newStatus =
      targetSchool.status === SchoolStatus.ACTIVE
        ? SchoolStatus.INACTIVE
        : SchoolStatus.ACTIVE;

    try {
      await updateSchoolStatus(targetSchool.id, { status: newStatus });
      setTargetSchool(null);
      await loadSchools();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Building2 className="h-3.5 w-3.5" />
              Institutional Multi-Tenancy
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {total} {total === 1 ? 'School' : 'Schools'} Registered
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isPlatformAdmin ? 'Institutional Schools Directory' : 'Assigned Institution'}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {isPlatformAdmin
              ? 'Govern, provision, inspect, and configure academic tenants across the platform.'
              : 'Institutional profile and administrative records for your assigned school.'}
          </p>
        </div>

        {isPlatformAdmin && (
          <div className="flex items-center gap-2">
            <Link
              href="/schools/new"
              id="add-school-btn"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Register New School</span>
            </Link>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by school name, slug code, or city..."
            className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          {isPlatformAdmin && (
            <div className="flex items-center gap-1 rounded-lg border border-input bg-background px-2.5 py-1">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer"
                aria-label="Filter schools by status"
              >
                <option value="ALL">All Statuses</option>
                <option value={SchoolStatus.ACTIVE}>Active Only</option>
                <option value={SchoolStatus.INACTIVE}>Inactive Only</option>
                <option value={SchoolStatus.SUSPENDED}>Suspended</option>
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={loadSchools}
            className="rounded-lg border border-border bg-background p-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh schools list"
            aria-label="Refresh schools list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Schools Table / Grid */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading institutional directory...</span>
          </div>
        ) : schools.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">No Institutional Schools Found</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                {search || statusFilter !== 'ALL'
                  ? 'No institutions match the current search or status filter criteria.'
                  : 'No schools have been provisioned in the database yet.'}
              </p>
            </div>
            {isPlatformAdmin && !search && statusFilter === 'ALL' && (
              <Link
                href="/schools/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First School</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                  <th className="px-4 py-3">Institution</th>
                  <th className="px-4 py-3">Code / Slug</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Enrollment & Faculty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {schools.map((school) => (
                  <tr key={school.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/schools/${school.id}`}
                            className="font-semibold text-foreground hover:text-primary transition-colors hover:underline block truncate"
                          >
                            {school.name}
                          </Link>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {school.email || school.domain || 'No contact email'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px]">
                      <span className="rounded bg-muted px-1.5 py-0.5 border border-border">
                        {school.code}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground">
                      {school.city ? `${school.city}, ${school.state || school.country}` : 'Global/Online'}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1" title="School Administrators">
                          <Users className="h-3 w-3 text-blue-500" />
                          <span>{school.administratorsCount ?? 0}</span>
                        </span>
                        <span className="inline-flex items-center gap-1" title="Faculty Teachers">
                          <Briefcase className="h-3 w-3 text-emerald-500" />
                          <span>{school.teachersCount ?? 0}</span>
                        </span>
                        <span className="inline-flex items-center gap-1" title="Enrolled Students">
                          <GraduationCap className="h-3 w-3 text-amber-500" />
                          <span>{school.studentsCount ?? 0}</span>
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <SchoolStatusBadge status={school.status} />
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/schools/${school.id}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          href={`/schools/${school.id}/edit`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Edit School"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                        {isPlatformAdmin && (
                          <button
                            type="button"
                            onClick={() => setTargetSchool(school)}
                            className={`rounded-lg p-1.5 transition-colors ${
                              school.status === SchoolStatus.ACTIVE
                                ? 'text-rose-600 hover:bg-rose-500/10'
                                : 'text-emerald-600 hover:bg-emerald-500/10'
                            }`}
                            title={
                              school.status === SchoolStatus.ACTIVE
                                ? 'Deactivate School'
                                : 'Reactivate School'
                            }
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/20">
            <span className="text-[11px] text-muted-foreground">
              Page {page} of {totalPages} &bull; Total {total} schools
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Confirmation Modal */}
      {targetSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              {targetSchool.status === SchoolStatus.ACTIVE
                ? 'Deactivate Institutional School?'
                : 'Reactivate Institutional School?'}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {targetSchool.status === SchoolStatus.ACTIVE ? (
                <>
                  Are you sure you want to deactivate{' '}
                  <span className="font-semibold text-foreground">
                    {targetSchool.name}
                  </span>
                  ? Its administrators and students will be restricted from performing
                  active academic operations. Records will be preserved.
                </>
              ) : (
                <>
                  Are you sure you want to reactivate{' '}
                  <span className="font-semibold text-foreground">
                    {targetSchool.name}
                  </span>
                  ? Normal operational access will be immediately restored.
                </>
              )}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => setTargetSchool(null)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-status-btn"
                disabled={isUpdatingStatus}
                onClick={handleStatusToggle}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all ${
                  targetSchool.status === SchoolStatus.ACTIVE
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Confirm {targetSchool.status === SchoolStatus.ACTIVE ? 'Deactivation' : 'Reactivation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
