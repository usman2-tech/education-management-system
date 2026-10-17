'use client';

/**
 * MODULE: Institutional Teacher Profile Editor
 *
 * PURPOSE:
 * Form interface for modifying teacher credentials, qualifications, contact info, and bio.
 * Enforces field-level RBAC: Teachers cannot modify their employee code or role.
 *
 * SECURITY:
 * Authorized Platform Admins, assigned School Admins, or the teacher themselves.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { UserRole, TeacherDto } from '@ems/contracts';
import { fetchTeacherById, updateTeacher } from '@/lib/teachers-api';
import {
  Briefcase,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  User,
  GraduationCap,
  Calendar,
  Phone,
  Building2,
} from 'lucide-react';

const editTeacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().min(1, 'Last name is required').max(60),
  phone: z.string().optional(),
  qualification: z.string().max(150).optional(),
  specialization: z.string().max(150).optional(),
  employeeCode: z.string().max(50).optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  joiningDate: z.string().optional(),
});

type EditTeacherFormData = z.infer<typeof editTeacherSchema>;

export default function EditTeacherPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user, effectiveRole } = useAuth();

  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;
  const isTeacher = effectiveRole === UserRole.TEACHER;

  const [teacher, setTeacher] = React.useState<TeacherDto | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditTeacherFormData>({
    resolver: zodResolver(editTeacherSchema),
  });

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchTeacherById(id)
      .then((data) => {
        setTeacher(data);
        reset({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          qualification: data.profile?.qualification || '',
          specialization: data.profile?.specialization || '',
          employeeCode: data.profile?.employeeCode || '',
          address: data.profile?.address || '',
          bio: data.profile?.bio || '',
          joiningDate: data.profile?.joiningDate
            ? new Date(data.profile.joiningDate).toISOString().split('T')[0]
            : '',
        });
      })
      .catch((err) => {
        console.error('Failed to load teacher for edit:', err);
        setServerError(err.message || 'Failed to load teacher details.');
      })
      .finally(() => setIsLoading(false));
  }, [id, reset]);

  const onSubmit = async (data: EditTeacherFormData) => {
    setServerError(null);
    try {
      await updateTeacher(id, {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() || undefined,
        qualification: data.qualification?.trim() || undefined,
        specialization: data.specialization?.trim() || undefined,
        // Only admins can modify employee code
        employeeCode: isAdmin ? data.employeeCode?.trim() || undefined : undefined,
        address: data.address?.trim() || undefined,
        bio: data.bio?.trim() || undefined,
        joiningDate: data.joiningDate ? `${data.joiningDate}T00:00:00.000Z` : undefined,
      });

      router.push(`/teachers/${id}`);
    } catch (err: any) {
      console.error('Update teacher failed:', err);
      setServerError(err.message || 'Failed to update teacher profile.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm font-medium">Loading faculty editor...</p>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">Teacher Not Found</h2>
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
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href={`/teachers/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Profile</span>
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Edit Faculty Profile
          </h1>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {teacher.firstName} {teacher.lastName}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Update faculty information, academic credentials, and contact records.
        </p>
      </div>

      {/* Error Banner */}
      {serverError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal & Account Section */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              Personal Identification
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                First Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                {...register('firstName')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Last Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                {...register('lastName')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Institutional Email (Immutable)
              </label>
              <input
                type="text"
                value={teacher.email}
                disabled
                className="w-full rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Contact Phone Number
              </label>
              <input
                type="text"
                {...register('phone')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Employee Code - RBAC Guarded */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  Employee Identifier Code
                </label>
                {!isAdmin && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Locked for Educator Role
                  </span>
                )}
              </div>
              <input
                type="text"
                {...register('employeeCode')}
                disabled={!isAdmin}
                className={`w-full font-mono rounded-lg border border-border px-3 py-2 text-sm ${
                  isAdmin
                    ? 'bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary'
                    : 'bg-muted/60 text-muted-foreground cursor-not-allowed'
                }`}
              />
              {!isAdmin && (
                <p className="text-[11px] text-muted-foreground">
                  Employee codes can only be modified by institutional administrators.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Credentials & Pedagogical Details */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              Pedagogical Credentials & Bio
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Academic Qualification
              </label>
              <input
                type="text"
                placeholder="e.g. Ph.D. in Analytical Geometry"
                {...register('qualification')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Instructional Specialization
              </label>
              <input
                type="text"
                placeholder="e.g. Advanced Calculus & STEM"
                {...register('specialization')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Joining Date
              </label>
              <input
                type="date"
                {...register('joiningDate')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Residential Street Address
              </label>
              <input
                type="text"
                placeholder="e.g. 42 Academic Way, Suite 12"
                {...register('address')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Faculty Professional Biography
            </label>
            <textarea
              rows={3}
              placeholder="Teaching achievements and pedagogical philosophy..."
              {...register('bio')}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/teachers/${id}`}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
