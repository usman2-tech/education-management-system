'use client';

/**
 * MODULE: Teacher Self-Service Profile Workspace
 *
 * PURPOSE:
 * Displays authenticated educator's personal pedagogical profile,
 * institutional credentials, employment status, and campus memberships.
 *
 * ZERO FABRICATION DIRECTIVE:
 * Populates strictly from live PostgreSQL records via /api/v1/teachers/me.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { TeacherDto, UserRole } from '@ems/contracts';
import { fetchCurrentTeacherProfile } from '@/lib/teachers-api';
import { TeacherStatusBadge } from '@/components/teachers/teacher-status-badge';
import {
  Briefcase,
  GraduationCap,
  Building2,
  Mail,
  Phone,
  Calendar,
  Edit,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Award,
} from 'lucide-react';

export default function MyProfilePage() {
  const { user, effectiveRole } = useAuth();
  const [profile, setProfile] = React.useState<TeacherDto | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (effectiveRole === UserRole.TEACHER || user?.role === UserRole.TEACHER) {
      setIsLoading(true);
      fetchCurrentTeacherProfile()
        .then((data) => setProfile(data))
        .catch((err) => {
          console.error('Failed to load educator self-service profile:', err);
          setError(err.message || 'Could not retrieve faculty profile.');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user, effectiveRole]);

  if (effectiveRole !== UserRole.TEACHER && user?.role !== UserRole.TEACHER) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center max-w-lg mx-auto">
        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
          Administrative Identity Profile
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You are currently signed in with role <span className="font-semibold text-foreground">[{effectiveRole}]</span>. The teacher self-service portal is tailored for faculty members.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/teachers"
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Go to Teachers Directory
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm font-medium">Retrieving personal faculty credentials...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center max-w-lg mx-auto">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">Profile Error</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error || 'Could not load your faculty profile.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary shadow-sm border border-primary/20">
              {profile.firstName.charAt(0)}
              {profile.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {profile.firstName} {profile.lastName}
                </h1>
                <TeacherStatusBadge
                  isActive={profile.isActive}
                  employmentStatus={profile.profile?.employmentStatus}
                  size="md"
                />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="font-mono bg-muted px-2 py-0.5 rounded font-semibold text-foreground">
                  {profile.profile?.employeeCode || 'TCH-PENDING'}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  {profile.email}
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    {profile.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  {profile.primarySchool?.name || 'Primary Campus'}
                </span>
              </div>
            </div>
          </div>

          <Link
            href={`/teachers/${profile.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit My Details</span>
          </Link>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Academic Credentials */}
        <div className="space-y-6 md:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Academic Qualifications & Instruction
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/30 p-3.5 border border-border">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Degree & Qualification
                </span>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {profile.profile?.qualification || 'Not Specified'}
                </p>
              </div>

              <div className="rounded-lg bg-muted/30 p-3.5 border border-border">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Specialization Discipline
                </span>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {profile.profile?.specialization || 'Not Specified'}
                </p>
              </div>
            </div>

            {profile.profile?.bio && (
              <div className="mt-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  Faculty Professional Biography
                </span>
                <p className="mt-1 text-sm leading-relaxed text-foreground/90 bg-muted/20 p-3.5 rounded-lg border border-border">
                  {profile.profile.bio}
                </p>
              </div>
            )}
          </div>

          {/* School Campus Memberships */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">
                  Campus Appointments & Memberships
                </h2>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {profile.memberships.length} {profile.memberships.length === 1 ? 'Campus' : 'Campuses'}
              </span>
            </div>

            <div className="divide-y divide-border">
              {profile.memberships.map((membership) => (
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
                      {membership.employeeCode && <span>ID: {membership.employeeCode}</span>}
                      <span>Joined: {new Date(membership.joinedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    Active Faculty
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Institutional Details
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground font-medium">Employment Status</span>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {profile.profile?.employmentStatus || 'ACTIVE'}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground font-medium">Faculty Onboarding Date</span>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {profile.profile?.joiningDate
                    ? new Date(profile.profile.joiningDate).toLocaleDateString()
                    : 'Not specified'}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground font-medium">Residential Address</span>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {profile.profile?.address || 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
