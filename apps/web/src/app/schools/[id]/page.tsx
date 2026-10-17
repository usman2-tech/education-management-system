'use client';

/**
 * MODULE: Institutional School Details View
 *
 * PURPOSE:
 * Displays single school tenant profile, active metrics, physical location,
 * appointed school administrators, and administrator assignment tools.
 *
 * ZERO FABRICATION DIRECTIVE:
 * Displays verified database counts and active administrator records.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  SchoolDto,
  SchoolAdministratorDto,
  SchoolStatus,
  UserRole,
} from '@ems/contracts';
import {
  fetchSchoolById,
  fetchSchoolAdministrators,
  updateSchoolStatus,
  assignSchoolAdministrator,
} from '@/lib/schools-api';
import { SchoolStatusBadge } from '@/components/schools/school-status-badge';
import {
  Building2,
  ArrowLeft,
  Edit,
  Power,
  Users,
  GraduationCap,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Globe,
  UserPlus,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function SchoolDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user, effectiveRole } = useAuth();
  const isPlatformAdmin = effectiveRole === UserRole.PLATFORM_ADMIN;

  const [school, setSchool] = React.useState<SchoolDto | null>(null);
  const [administrators, setAdministrators] = React.useState<
    SchoolAdministratorDto[]
  >([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Assign admin modal / form state
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState<boolean>(false);
  const [assignUserId, setAssignUserId] = React.useState<string>('');
  const [isAssigning, setIsAssigning] = React.useState<boolean>(false);
  const [assignMessage, setAssignMessage] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [schoolData, adminList] = await Promise.all([
        fetchSchoolById(id),
        fetchSchoolAdministrators(id).catch(() => []),
      ]);
      setSchool(schoolData);
      setAdministrators(adminList);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve institutional school records.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusToggle = async () => {
    if (!school) return;
    const newStatus =
      school.status === SchoolStatus.ACTIVE
        ? SchoolStatus.INACTIVE
        : SchoolStatus.ACTIVE;

    try {
      const updated = await updateSchoolStatus(school.id, { status: newStatus });
      setSchool(updated);
    } catch (err: any) {
      alert(`Status modification failed: ${err.message}`);
    }
  };

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId.trim() || !school) return;
    setIsAssigning(true);
    setAssignMessage(null);

    try {
      await assignSchoolAdministrator(school.id, assignUserId.trim());
      setAssignUserId('');
      setIsAssignModalOpen(false);
      await loadData();
    } catch (err: any) {
      setAssignMessage(err.message || 'Failed to assign administrator.');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Loading institutional profile...</span>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
        <h2 className="text-base font-bold text-foreground">Institutional Record Unavailable</h2>
        <p className="text-xs text-muted-foreground">{error || 'School not found.'}</p>
        <Link
          href="/schools"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Schools Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/schools" className="hover:text-foreground transition-colors">
          Schools
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground truncate">{school.name}</span>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {school.name}
              </h1>
              <SchoolStatusBadge status={school.status} size="md" />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono bg-muted px-2 py-0.5 rounded border border-border">
                Slug: {school.code}
              </span>
              {school.domain && (
                <span className="inline-flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <a
                    href={`https://${school.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline text-primary"
                  >
                    {school.domain}
                  </a>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Chartered {new Date(school.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/schools/${school.id}/edit`}
            id="edit-school-btn"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit Profile</span>
          </Link>

          {isPlatformAdmin && (
            <button
              type="button"
              id="toggle-status-btn"
              onClick={handleStatusToggle}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm transition-all ${
                school.status === SchoolStatus.ACTIVE
                  ? 'border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                  : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              <span>{school.status === SchoolStatus.ACTIVE ? 'Deactivate School' : 'Reactivate School'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards (Real database counts) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">
              {school.administratorsCount ?? administrators.length}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              School Administrators
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">
              {school.teachersCount ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Faculty Members
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">
              {school.studentsCount ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Enrolled Students
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Location & Details vs Appointed Administrators */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Campus Profile */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground border-b border-border pb-3">
            Campus Information
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] text-muted-foreground block">Email Contact</span>
                <span className="font-semibold text-foreground">
                  {school.email || 'Not provided'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] text-muted-foreground block">Telephone</span>
                <span className="font-semibold text-foreground">
                  {school.phone || 'Not provided'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] text-muted-foreground block">Physical Campus Address</span>
                <span className="font-semibold text-foreground block">
                  {school.address || 'Street address unlisted'}
                </span>
                <span className="text-muted-foreground block">
                  {[school.city, school.state, school.country].filter(Boolean).join(', ') ||
                    'Location unspecified'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Assigned School Administrators */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Appointed School Administrators
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Users holding administrative authority for this institutional tenant.
              </p>
            </div>

            {isPlatformAdmin && (
              <button
                type="button"
                id="open-assign-modal-btn"
                onClick={() => setIsAssignModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Assign Admin</span>
              </button>
            )}
          </div>

          {administrators.length === 0 ? (
            <div className="py-8 text-center">
              <ShieldCheck className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                No school administrators are currently assigned to this institution.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {administrators.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      {admin.firstName[0]}
                      {admin.lastName[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-foreground">
                        {admin.firstName} {admin.lastName}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {admin.email}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                      School Admin
                    </span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      Since {new Date(admin.assignedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Administrator Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Appoint School Administrator
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Assign an existing user to manage {school.name}.
                </p>
              </div>
            </div>

            {assignMessage && (
              <div className="my-3 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                {assignMessage}
              </div>
            )}

            <form onSubmit={handleAssignAdmin} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="assign-user-id-input"
                  className="block text-xs font-semibold text-foreground mb-1"
                >
                  User UUID / Identifier
                </label>
                <input
                  id="assign-user-id-input"
                  type="text"
                  required
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  placeholder="e.g. 268de511-db14-48cd-a6dd-155304949aa2"
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  User will be scoped to this school and granted SCHOOL_ADMIN privileges.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isAssigning}
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-assign-btn"
                  disabled={isAssigning}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
                >
                  {isAssigning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>Appoint Administrator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
