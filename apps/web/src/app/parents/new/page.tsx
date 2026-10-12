'use client';

/**
 * MODULE: Onboard New Parent / Legal Guardian
 *
 * PURPOSE:
 * Form allowing School Administrators and Platform Administrators to register
 * a new parent user account and initialize their family profile.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { createParent } from '@/lib/parents-api';
import {
  Users,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Save,
  Mail,
  User,
  Phone,
  Briefcase,
  MapPin,
  Lock,
} from 'lucide-react';

export default function NewParentPage() {
  const router = useRouter();
  const { effectiveRole } = useAuth();
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [occupation, setOccupation] = React.useState('');
  const [employer, setEmployer] = React.useState('');
  const [relationshipToFamily, setRelationshipToFamily] = React.useState('Mother');
  const [phoneAlt, setPhoneAlt] = React.useState('');
  const [address, setAddress] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isAdmin) {
      router.push('/parents');
    }
  }, [isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Please provide all mandatory identification details (First name, Last name, Email).');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createParent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        phone: phone.trim() || undefined,
        occupation: occupation.trim() || undefined,
        employer: employer.trim() || undefined,
        relationshipToFamily: relationshipToFamily.trim() || undefined,
        phoneAlt: phoneAlt.trim() || undefined,
        address: address.trim() || undefined,
      });

      router.push(`/parents/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create parent:', err);
      setError(err.message || 'Failed to onboard parent account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/parents"
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Onboard Parent / Legal Guardian
            </h1>
            <p className="text-sm text-muted-foreground">
              Register a family contact account and configure guardian credentials.
            </p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl border border-border bg-card space-y-8 shadow-sm">
        {/* Section 1: Identity & Credentials */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
            <User className="w-4 h-4 text-primary" />
            Personal & Access Credentials
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Sarah"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Chen"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Temporary Password (optional)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Defaults to Password123!"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
            <Phone className="w-4 h-4 text-primary" />
            Telephone & Communications
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Primary Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 019-4411"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Alternative / Emergency Phone
              </label>
              <input
                type="tel"
                value={phoneAlt}
                onChange={(e) => setPhoneAlt(e.target.value)}
                placeholder="+1 (555) 019-4412"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Residential Street Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="88 Evergreen Terrace, Seattle, WA"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Professional & Household Profile */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
            <Briefcase className="w-4 h-4 text-primary" />
            Occupation & Household Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Relationship to Family
              </label>
              <select
                value={relationshipToFamily}
                onChange={(e) => setRelationshipToFamily(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              >
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Legal Guardian">Legal Guardian</option>
                <option value="Step-Parent">Step-Parent</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Foster Parent">Foster Parent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Occupation
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Systems Architect"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Employer / Company
              </label>
              <input
                type="text"
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
                placeholder="e.g. Pacific Aerospace"
                className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
          <Link
            href="/parents"
            className="px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Register & Continue to Student Linking
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
