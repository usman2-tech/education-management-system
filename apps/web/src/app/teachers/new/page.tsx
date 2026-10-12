'use client';

/**
 * MODULE: Institutional Teacher Onboarding Form
 *
 * PURPOSE:
 * Form allowing Platform Administrators and School Administrators to onboard new faculty.
 * Implements Zod validation, React Hook Form, auto employee code generation,
 * and multi-campus affiliation selection.
 *
 * SECURITY:
 * Guarded for PLATFORM_ADMIN and SCHOOL_ADMIN. School Admins are locked to their own school.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserRole, SchoolDto } from '@ems/contracts';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { createTeacher } from '@/lib/teachers-api';
import { fetchSchools } from '@/lib/schools-api';
import {
  Briefcase,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Building2,
  User,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  Lock,
} from 'lucide-react';

const createTeacherSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .or(z.literal(''))
    .optional(),
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().min(1, 'Last name is required').max(60),
  schoolId: z.string().optional(),
  employeeCode: z.string().max(50).optional(),
  qualification: z.string().max(150).optional(),
  specialization: z.string().max(150).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
  joiningDate: z.string().optional(),
});

type CreateTeacherFormData = z.infer<typeof createTeacherSchema>;

export default function NewTeacherPage() {
  const router = useRouter();
  const { user, effectiveRole } = useAuth();
  const isPlatformAdmin = effectiveRole === UserRole.PLATFORM_ADMIN;

  const [availableSchools, setAvailableSchools] = React.useState<SchoolDto[]>([]);
  const [loadingSchools, setLoadingSchools] = React.useState<boolean>(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeacherFormData>({
    resolver: zodResolver(createTeacherSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      schoolId: user?.schoolId || '',
      employeeCode: '',
      qualification: '',
      specialization: '',
      phone: '',
      address: '',
      bio: '',
      joiningDate: new Date().toISOString().split('T')[0],
    },
  });

  const selectedSchoolId = watch('schoolId');

  React.useEffect(() => {
    if (isPlatformAdmin) {
      setLoadingSchools(true);
      fetchSchools({ limit: 100 })
        .then((res) => {
          setAvailableSchools(res.items || []);
          if (res.items.length > 0 && !selectedSchoolId) {
            setValue('schoolId', res.items[0].id);
          }
        })
        .catch((err) => console.error('Failed to load schools list:', err))
        .finally(() => setLoadingSchools(false));
    } else if (user?.schoolId) {
      setValue('schoolId', user.schoolId);
    }
  }, [isPlatformAdmin, user?.schoolId, setValue, selectedSchoolId]);

  const generateEmployeeCode = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setValue('employeeCode', `TCH-${randomSuffix}`);
  };

  const onSubmit = async (data: CreateTeacherFormData) => {
    setServerError(null);
    try {
      const finalSchoolId = isPlatformAdmin ? data.schoolId : user?.schoolId;
      if (!finalSchoolId) {
        setServerError('Target institutional school must be selected.');
        return;
      }

      const created = await createTeacher({
        email: data.email.trim(),
        password: data.password || 'Password123!',
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        schoolId: finalSchoolId,
        employeeCode: data.employeeCode?.trim() || undefined,
        qualification: data.qualification?.trim() || undefined,
        specialization: data.specialization?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        address: data.address?.trim() || undefined,
        bio: data.bio?.trim() || undefined,
        joiningDate: data.joiningDate ? `${data.joiningDate}T00:00:00.000Z` : undefined,
      });

      router.push(`/teachers/${created.id}`);
    } catch (err: any) {
      console.error('Teacher onboarding failed:', err);
      setServerError(err.message || 'Failed to onboard educator. Please verify email and employee code uniqueness.');
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN]}>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/teachers"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Teachers Directory</span>
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Onboard Faculty Member
            </h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Institutional Registration
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Register an educator, assign credentials, specify instructional specializations, and provision account access.
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Institutional Tenancy Selection */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Institutional Campus Tenancy
              </h2>
            </div>

            {isPlatformAdmin ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Primary Academic Institution <span className="text-destructive">*</span>
                </label>
                {loadingSchools ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading authorized institutions...</span>
                  </div>
                ) : (
                  <select
                    {...register('schoolId')}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {availableSchools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) - {s.city || 'Campus'}, {s.state || s.country || ''}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Platform Administrators can assign faculty to any operational institutional tenant.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-muted/50 p-4 border border-border flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Assigned Campus
                  </div>
                  <div className="text-sm font-bold text-foreground mt-0.5">
                    {user?.school?.name || 'Authorized School'}
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium">
                  Tenant Bound
                </span>
              </div>
            )}
          </div>

          {/* Personal Identity & Credentials */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Personal & Account Information
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  First Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah"
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
                  placeholder="e.g. Jenkins"
                  {...register('lastName')}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="e.g. sarah.jenkins@stjude.ems.local"
                    {...register('email')}
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Temporary Initial Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder="Defaults to Password123! if blank"
                    {...register('password')}
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="e.g. +1-555-019-4421"
                    {...register('phone')}
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Employee Identifier Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. TCH-2041"
                    {...register('employeeCode')}
                    className="w-full font-mono rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={generateEmployeeCode}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Generate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Faculty Credentials & Pedagogical Profile */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-border pb-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Pedagogical Profile & Qualifications
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Highest Academic Qualification
                </label>
                <input
                  type="text"
                  placeholder="e.g. M.Sc. in Organic Chemistry, B.Ed."
                  {...register('qualification')}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Instructional Specialization / Discipline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Chemistry & AP Physical Sciences"
                  {...register('specialization')}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Joining / Employment Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    {...register('joiningDate')}
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Residential Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 742 Evergreen Terrace, Seattle, WA"
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
                placeholder="Brief summary of teaching philosophy, research achievements, or previous departmental roles..."
                {...register('bio')}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/teachers"
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
                  <span>Onboarding Faculty...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Onboarding</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
