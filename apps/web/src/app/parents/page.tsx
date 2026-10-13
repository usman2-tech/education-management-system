'use client';

/**
 * MODULE: Institutional Parents & Guardians Directory
 *
 * PURPOSE:
 * Displays parent/guardian directory with linked students, relationship status,
 * contact details, and multi-tenant administrative controls.
 *
 * SECURITY:
 * Accessible to School Administrators and Platform Administrators only.
 * School Admins see only parents and linked students affiliated with their school.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ParentGuardianDto, UserRole, RelationshipVerificationStatus } from '@ems/contracts';
import { fetchParents } from '@/lib/parents-api';
import {
  Users,
  Plus,
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Mail,
  Phone,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export default function ParentsPage() {
  const router = useRouter();
  const { user, effectiveRole } = useAuth();
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const [parents, setParents] = React.useState<ParentGuardianDto[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(1);
  const [limit] = React.useState<number>(10);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadParents = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchParents({
        page,
        limit,
        search: search.trim() || undefined,
      });

      setParents(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to load parents:', err);
      setError(err.message || 'Failed to retrieve parent directory records.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search]);

  React.useEffect(() => {
    if (isAdmin) {
      loadParents();
    } else if (effectiveRole === UserRole.PARENT) {
      router.push('/parent/dashboard');
    }
  }, [isAdmin, effectiveRole, loadParents, router]);

  const getVerificationBadge = (status: RelationshipVerificationStatus) => {
    switch (status) {
      case RelationshipVerificationStatus.VERIFIED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </span>
        );
      case RelationshipVerificationStatus.PENDING_VERIFICATION:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" />
            Pending
          </span>
        );
      case RelationshipVerificationStatus.REVOKED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Revoked
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Parents & Legal Guardians
              </h1>
              <p className="text-sm text-muted-foreground">
                Institutional directory of verified family relationships, guardians, and emergency contacts.
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <Link
            href="/parents/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Onboard Parent
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by parent name, email, or linked student..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        <button
          onClick={loadParents}
          className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm hover:bg-accent/50 transition"
          title="Refresh Directory"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Section */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="px-5 py-3.5">Guardian Name</th>
                <th className="px-5 py-3.5">Contact Details</th>
                <th className="px-5 py-3.5">Linked Students</th>
                <th className="px-5 py-3.5">School Affiliation</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading parent directory...
                  </td>
                </tr>
              ) : parents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-foreground">No parent or guardian records found.</p>
                    <p className="text-xs mt-1">Get started by creating a guardian profile and linking enrolled students.</p>
                    {isAdmin && (
                      <Link
                        href="/parents/new"
                        className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-primary hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Onboard First Parent
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                parents.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition">
                    <td className="px-5 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {p.firstName[0]}
                          {p.lastName[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {p.firstName} {p.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p.profile?.occupation || 'Parent / Legal Guardian'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 text-primary/70" />
                          {p.email}
                        </span>
                        {p.phone && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 text-primary/70" />
                            {p.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        {p.linkedStudents && p.linkedStudents.length > 0 ? (
                          p.linkedStudents.map((child) => (
                            <div key={child.id} className="flex items-center gap-2 text-xs">
                              <GraduationCap className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                              <span className="font-medium text-foreground">
                                {child.firstName} {child.lastName}
                              </span>
                              <span className="text-muted-foreground text-[11px]">
                                ({child.relationshipType})
                              </span>
                              {getVerificationBadge(child.verificationStatus)}
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            No students linked yet
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{p.primarySchool?.name || 'Multi-School Campus'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {p.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/parents/${p.id}`}
                          className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground transition"
                          title="View Profile & Relationships"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {isAdmin && (
                          <Link
                            href={`/parents/${p.id}/edit`}
                            className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground transition"
                            title="Edit Parent Details"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{parents.length}</span> of{' '}
            <span className="font-semibold text-foreground">{total}</span> total parents
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
