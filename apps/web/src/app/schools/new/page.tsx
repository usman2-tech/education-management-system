'use client';

/**
 * MODULE: Institutional School Registration
 *
 * PURPOSE:
 * Form allowing Platform Administrators to register new academic institutions.
 * Enforces Zod schema validation and React Hook Form bindings.
 *
 * SECURITY:
 * Platform Admin authorization required.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserRole } from '@ems/contracts';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { createSchool } from '@/lib/schools-api';
import {
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

const createSchoolSchema = z.object({
  name: z
    .string()
    .min(3, 'School name must be at least 3 characters')
    .max(150, 'School name cannot exceed 150 characters'),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(50, 'Code cannot exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Code must contain only lowercase letters, numbers, and hyphens'),
  domain: z.string().optional(),
  email: z.string().email('Invalid email address format').or(z.literal('')).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('USA').optional(),
});

type CreateSchoolFormData = z.infer<typeof createSchoolSchema>;

export default function NewSchoolPage() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateSchoolFormData>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: {
      name: '',
      code: '',
      domain: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: 'USA',
    },
  });

  const schoolName = watch('name');

  const generateSlug = () => {
    if (!schoolName) return;
    const slug = schoolName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setValue('code', slug, { shouldValidate: true });
  };

  const onSubmit = async (data: CreateSchoolFormData) => {
    setServerError(null);
    try {
      const created = await createSchool({
        ...data,
        email: data.email || undefined,
        domain: data.domain || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        country: data.country || 'USA',
      });
      router.push(`/schools/${created.id}`);
    } catch (err: any) {
      setServerError(err.message || 'Failed to create institutional school tenant.');
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.PLATFORM_ADMIN]}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/schools" className="hover:text-foreground transition-colors">
            Schools
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Register New Institution</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Building2 className="h-3.5 w-3.5" />
                New Institution
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              Register Institutional School
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Provision a new isolated academic tenant in the database.
            </p>
          </div>

          <Link
            href="/schools"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Cancel</span>
          </Link>
        </div>

        {/* Server Error */}
        {serverError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{serverError}</div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3">
              Core Institutional Identity
            </h3>

            {/* School Name */}
            <div>
              <label htmlFor="school-name-input" className="block text-xs font-semibold text-foreground mb-1">
                Official Institution Name <span className="text-destructive">*</span>
              </label>
              <input
                id="school-name-input"
                type="text"
                {...register('name')}
                placeholder="e.g. Oxford Classical Academy"
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {errors.name && (
                <p className="mt-1 text-[11px] text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Code / Slug */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="school-code-input" className="block text-xs font-semibold text-foreground">
                  Unique Code / Slug Identifier <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateSlug}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  Auto-generate from Name
                </button>
              </div>
              <input
                id="school-code-input"
                type="text"
                {...register('code')}
                placeholder="e.g. oxford-classical"
                className="w-full h-10 rounded-xl border border-input bg-background px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Permanent unique slug used for database tenancy scoping and routing.
              </p>
              {errors.code && (
                <p className="mt-1 text-[11px] text-destructive">{errors.code.message}</p>
              )}
            </div>

            {/* Custom Domain */}
            <div>
              <label htmlFor="school-domain-input" className="block text-xs font-semibold text-foreground mb-1">
                Custom Domain (Optional)
              </label>
              <input
                id="school-domain-input"
                type="text"
                {...register('domain')}
                placeholder="e.g. oxford.ems.local or oxfordacademy.edu"
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Contact & Physical Address */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3">
              Contact & Campus Location
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="school-email-input" className="block text-xs font-semibold text-foreground mb-1">
                  Administrative Email
                </label>
                <input
                  id="school-email-input"
                  type="email"
                  {...register('email')}
                  placeholder="e.g. administration@oxford.ems.local"
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                {errors.email && (
                  <p className="mt-1 text-[11px] text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="school-phone-input" className="block text-xs font-semibold text-foreground mb-1">
                  Primary Phone Number
                </label>
                <input
                  id="school-phone-input"
                  type="text"
                  {...register('phone')}
                  placeholder="e.g. +1-555-019-4822"
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="school-address-input" className="block text-xs font-semibold text-foreground mb-1">
                Campus Street Address
              </label>
              <input
                id="school-address-input"
                type="text"
                {...register('address')}
                placeholder="e.g. 500 University Avenue, Education Square"
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="school-city-input" className="block text-xs font-semibold text-foreground mb-1">
                  City
                </label>
                <input
                  id="school-city-input"
                  type="text"
                  {...register('city')}
                  placeholder="e.g. Boston"
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label htmlFor="school-state-input" className="block text-xs font-semibold text-foreground mb-1">
                  State / Province
                </label>
                <input
                  id="school-state-input"
                  type="text"
                  {...register('state')}
                  placeholder="e.g. MA"
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label htmlFor="school-country-input" className="block text-xs font-semibold text-foreground mb-1">
                  Country
                </label>
                <input
                  id="school-country-input"
                  type="text"
                  {...register('country')}
                  placeholder="USA"
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/schools"
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
            <button
              id="submit-create-school-btn"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Registering Institution...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Registration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
