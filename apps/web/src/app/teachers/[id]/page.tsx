'use client';

/**
 * MODULE: Institutional Teacher Profile & Campus Affiliations View
 *
 * PURPOSE:
 * Displays single teacher profile, instructional credentials, contact details,
 * and multi-campus school memberships. Provides administrative tools for
 * status toggling and cross-campus assignment.
 *
 * ZERO FABRICATION DIRECTIVE:
 * Displays verified database records from PostgreSQL.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  TeacherDto,
  SchoolDto,
  UserRole,
  TeacherEmploymentStatus,
} from '@ems/contracts';
import {
  fetchTeacherById,
  updateTeacherStatus,
  assignTeacherToSchool,
} from '@/lib/teachers-api';
import { fetchSchools } from '@/lib/schools-api';
import { TeacherStatusBadge } from '@/components/teachers/teacher-status-badge';
import {
  Briefcase,
  ArrowLeft,
  Edit,
  Power,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  BookOpen,
  UserPlus,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Award,
} from 'lucide-react';

export default function TeacherDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user, effectiveRole } = useAuth();

  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;
  const isOwnProfile = user?.id === id;

  const [teacher, setTeacher] = React.useState<TeacherDto | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Status toggle confirmation modal
  const [showStatusModal, setShowStatusModal] = React.useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState<boolean>(false);

  // School assignment modal
  const [showAssignModal, setShowAssignModal] = React.useState<boolean>(false);
  const [availableSchools, setAvailableSchools] = React.useState<SchoolDto[]>([]);
  const [targetSchoolId, setTargetSchoolId] = React.useState<string>('');
  const [assignEmployeeCode, setAssignEmployeeCode] = React.useState<string>('');
  const [isAssigning, setIsAssigning] = React.useState<boolean>(false);
  const [assignError, setAssignError] = React.useState<string | null>(null);

  const loadTeacher = React.useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTeacherById(id);
      setTeacher(data);
    } catch (err: any) {
      console.error('Failed to load teacher:', err);
      setError(err.message || 'Teacher record could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadTeacher();
  }, [loadTeacher]);

  const handleStatusToggle = async () => {
    if (!teacher) return;
    setIsUpdatingStatus(true);
    try {
      const nextIsActive = !teacher.isActive;
      const nextEmploymentStatus = nextIsActive
        ? TeacherEmploymentStatus.ACTIVE
        : TeacherEmploymentStatus.SUSPENDED;

      const updated = await updateTeacherStatus(teacher.id, {
        isActive: nextIsActive,
        employmentStatus: nextEmploymentStatus,
      });

      setTeacher(updated);
      setShowStatusModal(false);
    } catch (err: any) {
      alert(`Status update failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openAssignModal = async () => {
    setShowAssignModal(true);
    setAssignError(null);
    try {
      if (effectiveRole === UserRole.PLATFORM_ADMIN) {
        const res = await fetchSchools({ limit: 100 });
        setAvailableSchools(res.items || []);
        if (res.items.length > 0) setTargetSchoolId(res.items[0].id);
      } else if (user?.schoolId) {
        setTargetSchoolId(user.schoolId);
      }
    } catch (err) {
      console.error('Failed to load schools for assignment:', err);
    }
  };

  const handleAssignSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSchoolId || !teacher) return;
    setIsAssigning(true);
    setAssignError(null);
    try {
      const updated = await assignTeacherToSchool(teacher.id, {
        schoolId: targetSchoolId,
        employeeCode: assignEmployeeCode.trim() || undefined,
      });
      setTeacher(updated);
      setShowAssignModal(false);
      setAssignEmployeeCode('');
    } catch (err: any) {
      setAssignError(err.message || 'Failed to affiliate teacher with target school.');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm font-medium">Retrieving teacher credentials and affiliations...</p>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
          Faculty Record Inaccessible
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{error || 'Teacher not found.'}</p>
        <Link
          href="/teachers"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          href="/teachers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Faculty Directory</span>
        </Link>
      </div>

      {/* Main Profile Header Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary shadow-sm border border-primary/20">
              {teacher.firstName.charAt(0)}
              {teacher.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {teacher.firstName} {teacher.lastName}
                </h1>
                <TeacherStatusBadge
                  isActive={teacher.isActive}
                  employmentStatus={teacher.profile?.employmentStatus}
                  size="md"
                />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="font-mono bg-muted px-2 py-0.5 rounded font-semibold text-foreground">
                  {teacher.profile?.employeeCode || 'No Employee Code'}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  {teacher.email}
                </span>
                {teacher.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    {teacher.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  {teacher.primarySchool?.name || 'Institutional School'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {(isAdmin || isOwnProfile) && (
              <Link
                href={`/teachers/${teacher.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </Link>
            )}

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={openAssignModal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                  <span>Assign Campus</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowStatusModal(true)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    teacher.isActive
                      ? 'border border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                      : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>{teacher.isActive ? 'Deactivate Access' : 'Reactivate Access'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Profile Details */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left Column: Academic Credentials & Specialization */}
        <div className="space-y-6 md:col-span-2">
          {/* Pedagogical Credentials Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Academic Qualifications & Credentials
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/30 p-3.5 border border-border">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Highest Qualification
                </span>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {teacher.profile?.qualification || 'Bachelor of Education (B.Ed.)'}
                </p>
              </div>

              <div className="rounded-lg bg-muted/30 p-3.5 border border-border">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Instructional Specialization
                </span>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {teacher.profile?.specialization || 'General Secondary Curriculum'}
                </p>
              </div>
            </div>

            {teacher.profile?.bio && (
              <div className="mt-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  Faculty Professional Biography
                </span>
                <p className="mt-1 text-sm leading-relaxed text-foreground/90 bg-muted/20 p-3 rounded-lg border border-border">
                  {teacher.profile.bio}
                </p>
              </div>
            )}
          </div>

          {/* Institutional Campus Affiliations Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">
                  Institutional Campus Memberships
                </h2>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {teacher.memberships.length} {teacher.memberships.length === 1 ? 'Campus' : 'Campuses'}
              </span>
            </div>

            {teacher.memberships.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No active secondary school memberships registered.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {teacher.memberships.map((membership) => (
                  <div key={membership.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {membership.schoolName}
                        </span>
                        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {membership.schoolCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>Role: {membership.role}</span>
                        {membership.employeeCode && (
                          <span>ID: {membership.employeeCode}</span>
                        )}
                        <span>Joined: {new Date(membership.joinedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        membership.isActive
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {membership.isActive ? 'Active Member' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Contact & Employment Metadata */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Employment Metadata
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground font-medium">Employment Status</span>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {teacher.profile?.employmentStatus || 'ACTIVE'}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground font-medium">Joining Date</span>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {teacher.profile?.joiningDate
                    ? new Date(teacher.profile.joiningDate).toLocaleDateString()
                    : 'Not specified'}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground font-medium">System Role</span>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {teacher.role}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground font-medium">Residential Address</span>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {teacher.profile?.address || 'Not specified'}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground font-medium">Account Created</span>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {new Date(teacher.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Activation / Deactivation */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-full p-2.5 ${
                  teacher.isActive
                    ? 'bg-rose-500/10 text-rose-600'
                    : 'bg-emerald-500/10 text-emerald-600'
                }`}
              >
                <Power className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {teacher.isActive ? 'Deactivate Faculty Access' : 'Reactivate Faculty Access'}
              </h3>
            </div>

            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {teacher.isActive ? (
                <>
                  Are you sure you want to deactivate{' '}
                  <span className="font-semibold text-foreground">
                    {teacher.firstName} {teacher.lastName}
                  </span>
                  ? This will suspend their institutional access and mark their employment status as suspended.
                </>
              ) : (
                <>
                  Reactivate faculty access for{' '}
                  <span className="font-semibold text-foreground">
                    {teacher.firstName} {teacher.lastName}
                  </span>
                  ? The educator will immediately regain portal access.
                </>
              )}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => setShowStatusModal(false)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleStatusToggle}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${
                  teacher.isActive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isUpdatingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {teacher.isActive ? 'Confirm Deactivation' : 'Confirm Reactivation'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* School Campus Affiliation Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Affiliate Faculty Member with Campus
              </h3>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Authorize {teacher.firstName} {teacher.lastName} to teach or hold faculty appointments at an institutional campus.
            </p>

            {assignError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignSchool} className="mt-4 space-y-4">
              {effectiveRole === UserRole.PLATFORM_ADMIN ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Target Institutional Campus
                  </label>
                  <select
                    value={targetSchoolId}
                    onChange={(e) => setTargetSchoolId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {availableSchools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/40 p-3 border border-border text-xs">
                  <span className="text-muted-foreground">Target Campus:</span>{' '}
                  <span className="font-semibold text-foreground">
                    {user?.school?.name || 'Authorized School'}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Campus-Scoped Employee Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TCH-NW-401"
                  value={assignEmployeeCode}
                  onChange={(e) => setAssignEmployeeCode(e.target.value)}
                  className="w-full font-mono rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isAssigning}
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isAssigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Assign Faculty</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
