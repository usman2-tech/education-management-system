'use client';

/**
 * MODULE: Institutional School Profile Editor
 *
 * PURPOSE:
 * Provides form interface for modifying institutional school attributes.
 * Enforces field-level RBAC restrictions (School Admins cannot modify code or status).
 *
 * SECURITY:
 * Authorized Platform Admins or assigned School Admins only.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { UserRole, SchoolDto } from '@ems/contracts';
import { fetchSchoolById, updateSchool } from '@/lib/schools-api';
import {
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';

const editSchoolSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(150),
  domain: z.string().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

type EditSchoolFormData = z.infer<typeof editSchoolSchema>;

export default function EditSchoolPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { effectiveRole } = useAuth();
  const isPlatformAdmin = effectiveRole === UserRole.PLATFORM_ADMIN;

  const [school, setSchool] = React.useState<SchoolDto | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditSchoolFormData>({
    resolver: zodResolver(editSchoolSchema),
  });

  React.useEffect(() => {
    async function loadSchool() {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await fetchSchoolById(id);
        setSchool(data);
        reset({
          name: data.name,
          domain: data.domain || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'USA',
        });
      } catch (err: any) {
        setServerError(err.message || 'Failed to load school profile.');
      } finally {
        setIsLoading(false);
      }
    }
    loadSchool();
  }, [id, reset]);

  const onSubmit = async (data: EditSchoolFormData) => {
    if (!id) return;
    setServerError(null);

    try {
      await updateSchool(id, {
        name: data.name,
        domain: data.domain || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        country: data.country || undefined,
      });

      router.push(`/schools/${id}`);
    } catch (err: any) {
      setServerError(err.message || 'Failed to update school profile.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Loading school editor...</span>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center space-y-3">
        <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
        <h2 className="text-sm font-bold text-foreground">School Not Accessible</h2>
        <p className="text-xs text-muted-foreground">{serverError || 'School record not found.'}</p>
        <Link
          href="/schools"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Schools</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/schools" className="hover:text-foreground transition-colors">
          Schools
        </Link>
        <span>/</span>
        <Link href={`/schools/${school.id}`} className="hover:text-foreground transition-colors truncate">
          {school.name}
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground">Edit Profile</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Building2 className="h-3.5 w-3.5" />
              Profile Editor
            </span>
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border border-border">
              {school.code}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Edit {school.name}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {isPlatformAdmin
              ? 'Authorized Platform Administrator full configuration mode.'
              : 'Authorized School Administrator institutional contact update mode.'}
          </p>
        </div>

        <Link
          href={`/schools/${school.id}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Cancel</span>
        </Link>
      </div>

      {serverError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-foreground border-b border-border pb-3">
            Institutional Details
          </h3>

          <div>
            <label htmlFor="edit-school-name" className="block text-xs font-semibold text-foreground mb-1">
              Official Institution Name
            </label>
            <input
              id="edit-school-name"
              type="text"
              {...register('name')}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.name && (
              <p className="mt-1 text-[11px] text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Permanent Identifier Code
            </label>
            <div className="relative">
              <input
                type="text"
                disabled
                value={school.code}
                className="w-full h-10 rounded-xl border border-input bg-muted/60 px-3 font-mono text-xs text-muted-foreground cursor-not-allowed"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                Immutable Slug
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="edit-school-domain" className="block text-xs font-semibold text-foreground mb-1">
              Custom Domain
            </label>
            <input
              id="edit-school-domain"
              type="text"
              {...register('domain')}
              placeholder="e.g. stjude.ems.local"
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Contact and Address */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-foreground border-b border-border pb-3">
            Contact & Location Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-school-email" className="block text-xs font-semibold text-foreground mb-1">
                Administrative Email
              </label>
              <input
                id="edit-school-email"
                type="email"
                {...register('email')}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.email && (
                <p className="mt-1 text-[11px] text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="edit-school-phone" className="block text-xs font-semibold text-foreground mb-1">
                Primary Phone Number
              </label>
              <input
                id="edit-school-phone"
                type="text"
                {...register('phone')}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-school-address" className="block text-xs font-semibold text-foreground mb-1">
              Physical Street Address
            </label>
            <input
              id="edit-school-address"
              type="text"
              {...register('address')}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="edit-school-city" className="block text-xs font-semibold text-foreground mb-1">
                City
              </label>
              <input
                id="edit-school-city"
                type="text"
                {...register('city')}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label htmlFor="edit-school-state" className="block text-xs font-semibold text-foreground mb-1">
                State / Province
              </label>
              <input
                id="edit-school-state"
                type="text"
                {...register('state')}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label htmlFor="edit-school-country" className="block text-xs font-semibold text-foreground mb-1">
                Country
              </label>
              <input
                id="edit-school-country"
                type="text"
                {...register('country')}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/schools/${school.id}`}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
          <button
            id="submit-edit-school-btn"
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Modifications...</span>
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
