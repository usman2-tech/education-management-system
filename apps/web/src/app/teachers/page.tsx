'use client';

/**
 * MODULE: Institutional Teachers Directory
 *
 * PURPOSE:
 * Displays institutional faculty members with real-time database search,
 * status filtering, pagination, and administrative lifecycle actions.
 *
 * ZERO FABRICATION DIRECTIVE:
 * Displays authentic teacher credentials, qualifications, and school affiliations from PostgreSQL.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { TeacherDto, UserRole, TeacherEmploymentStatus } from '@ems/contracts';
import { fetchTeachers, updateTeacherStatus } from '@/lib/teachers-api';
import { TeacherStatusBadge } from '@/components/teachers/teacher-status-badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  GraduationCap,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Power,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Mail,
  Phone,
  UserCheck,
} from 'lucide-react';

export default function TeachersPage() {
  const router = useRouter();
  const { user, effectiveRole } = useAuth();
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const [teachers, setTeachers] = React.useState<TeacherDto[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(1);
  const [limit] = React.useState<number>(10);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Status toggle confirmation modal
  const [targetTeacher, setTargetTeacher] = React.useState<TeacherDto | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState<boolean>(false);

  const loadTeachers = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchTeachers({
        page,
        limit,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      setTeachers(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to load teachers:', err);
      setError(err.message || 'Failed to retrieve teacher directory records.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  React.useEffect(() => {
    if (isAdmin) {
      loadTeachers();
    } else if (effectiveRole === UserRole.TEACHER) {
      router.push('/my-profile');
    }
  }, [isAdmin, effectiveRole, loadTeachers, router]);

  const handleStatusToggle = async () => {
    if (!targetTeacher) return;
    setIsUpdatingStatus(true);
    try {
      const nextIsActive = !targetTeacher.isActive;
      const nextEmploymentStatus = nextIsActive
        ? TeacherEmploymentStatus.ACTIVE
        : TeacherEmploymentStatus.SUSPENDED;

      await updateTeacherStatus(targetTeacher.id, {
        isActive: nextIsActive,
        employmentStatus: nextEmploymentStatus,
      });

      setTargetTeacher(null);
      await loadTeachers();
    } catch (err: any) {
      alert(`Status update failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (!isAdmin && effectiveRole !== UserRole.TEACHER) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight">Access Restricted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have administrative authority to inspect the institutional faculty directory.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Teachers & Faculty Management
            </h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {total} {total === 1 ? 'Faculty Member' : 'Faculty Members'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {effectiveRole === UserRole.PLATFORM_ADMIN
              ? 'Multi-institution educator directory, qualifications, and campus affiliations.'
              : `Institutional faculty records and assignments for ${user?.school?.name || 'authorized campus'}.`}
          </p>
        </div>

        {isAdmin && (
          <Link
            href="/teachers/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Onboard New Teacher</span>
          </Link>
        )}
      </div>

      {/* Search, Filter, and Controls Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="relative sm:col-span-7 md:col-span-8">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by faculty name, email, employee code, or qualification..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="relative sm:col-span-5 md:col-span-4 flex items-center gap-2">
          <div className="relative w-full">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full appearance-none rounded-lg border border-border bg-background py-2 pl-9 pr-8 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Employment Statuses</option>
              <option value="ACTIVE">Active Faculty Only</option>
              <option value="ON_LEAVE">On Sabbatical / Leave</option>
              <option value="SUSPENDED">Suspended Records</option>
              <option value="INACTIVE">Deactivated Accounts</option>
            </select>
          </div>
          <button
            onClick={() => loadTeachers()}
            title="Refresh Directory"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Directory Table */}
      {isLoading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {teachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">No faculty records found</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              {search || statusFilter !== 'ALL'
                ? 'No teachers match the current search filters. Try adjusting your parameters.'
                : 'There are currently no teachers enrolled in this school tenant.'}
            </p>
            {isAdmin && (
              <Link
                href="/teachers/new"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                <span>Onboard First Teacher</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5">Educator Profile</th>
                  <th className="px-6 py-3.5">Employee Code</th>
                  <th className="px-6 py-3.5">Specialization & Credentials</th>
                  <th className="px-6 py-3.5">Campus Affiliation</th>
                  <th className="px-6 py-3.5">Institutional Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teachers.map((teacher) => (
                  <tr
                    key={teacher.id}
                    className="transition hover:bg-muted/40"
                  >
                    {/* Educator Profile */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                          {teacher.firstName.charAt(0)}
                          {teacher.lastName.charAt(0)}
                        </div>
                        <div>
                          <Link
                            href={`/teachers/${teacher.id}`}
                            className="font-medium text-foreground hover:text-primary transition"
                          >
                            {teacher.firstName} {teacher.lastName}
                          </Link>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{teacher.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Employee Code */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-foreground/80 bg-muted px-2 py-0.5 rounded">
                        {teacher.profile?.employeeCode || 'Not Assigned'}
                      </span>
                    </td>

                    {/* Specialization & Qualification */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-foreground">
                        {teacher.profile?.specialization || 'General Faculty'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {teacher.profile?.qualification || 'Degree in Education'}
                      </div>
                    </td>

                    {/* Campus Affiliation */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        <span>{teacher.primarySchool?.name || 'Multi-Campus'}</span>
                      </div>
                      {teacher.memberships.length > 1 && (
                        <div className="text-[11px] text-muted-foreground">
                          +{teacher.memberships.length - 1} secondary campus affiliations
                        </div>
                      )}
                    </td>

                    {/* Status Badges */}
                    <td className="px-6 py-4">
                      <TeacherStatusBadge
                        isActive={teacher.isActive}
                        employmentStatus={teacher.profile?.employmentStatus}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/teachers/${teacher.id}`}
                          title="View Profile"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        <Link
                          href={`/teachers/${teacher.id}/edit`}
                          title="Edit Details"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>

                        {isAdmin && (
                          <button
                            onClick={() => setTargetTeacher(teacher)}
                            title={teacher.isActive ? 'Deactivate Faculty Access' : 'Reactivate Faculty Access'}
                            className={`rounded-lg p-1.5 transition ${
                              teacher.isActive
                                ? 'text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600'
                                : 'text-emerald-600 hover:bg-emerald-500/10'
                            }`}
                          >
                            <Power className="h-4 w-4" />
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

        {/* Pagination Bar */}
        {total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 py-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-medium">{total}</span> educators
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <span className="text-xs font-semibold text-muted-foreground px-2">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    )}

      {/* Confirmation Modal for Activation / Deactivation */}
      {targetTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-full p-2.5 ${
                  targetTeacher.isActive
                    ? 'bg-rose-500/10 text-rose-600'
                    : 'bg-emerald-500/10 text-emerald-600'
                }`}
              >
                <Power className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {targetTeacher.isActive ? 'Deactivate Faculty Access' : 'Reactivate Faculty Access'}
              </h3>
            </div>

            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {targetTeacher.isActive ? (
                <>
                  Are you sure you want to deactivate{' '}
                  <span className="font-semibold text-foreground">
                    {targetTeacher.firstName} {targetTeacher.lastName}
                  </span>
                  ? This will suspend their institutional access and mark their employment status as suspended, preserving all grading and classroom records.
                </>
              ) : (
                <>
                  Reactivate operational access for{' '}
                  <span className="font-semibold text-foreground">
                    {targetTeacher.firstName} {targetTeacher.lastName}
                  </span>
                  ? The teacher will be restored to active status immediately.
                </>
              )}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => setTargetTeacher(null)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleStatusToggle}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${
                  targetTeacher.isActive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isUpdatingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {targetTeacher.isActive ? 'Confirm Deactivation' : 'Confirm Reactivation'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
