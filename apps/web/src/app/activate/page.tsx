'use client';

/**
 * MODULE: Institutional Account Activation Portal
 *
 * PURPOSE:
 * Allows newly invited institutional users (Teachers, Students, Parents, School Admins)
 * to claim their profile, establish a secure password, and activate their credentials.
 *
 * DEPENDENCIES:
 * apiClient, ThemeToggle, lucide-react, next/navigation
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  School,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
} from 'lucide-react';

interface InvitationDetails {
  email: string;
  role: string;
  schoolName: string;
  firstName?: string;
  lastName?: string;
}

function ActivateAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = React.useState('');
  const [details, setDetails] = React.useState<InvitationDetails | null>(null);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      fetchDetails(urlToken);
    }
  }, [searchParams]);

  const fetchDetails = async (tokenValue: string) => {
    if (!tokenValue.trim()) return;
    setIsFetchingDetails(true);
    setErrorMessage(null);

    try {
      const data = await apiClient.get<InvitationDetails>(
        `/auth/invitation-details?token=${encodeURIComponent(tokenValue.trim())}`
      );
      setDetails(data);
      if (data.firstName) setFirstName(data.firstName);
      if (data.lastName) setLastName(data.lastName);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'The invitation token is invalid, expired, or has already been used.'
      );
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleTokenBlur = () => {
    if (token.trim() && !details) {
      fetchDetails(token);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage('Please enter your invitation token.');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Please provide your first and last name.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('The passwords entered do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post('/auth/activate', {
        token: token.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Account activation failed. The token may be expired or already consumed.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl shadow-foreground/5">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
          <KeyRound className="h-3.5 w-3.5" />
          Institutional Account Activation
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Activate Your Credentials
        </h2>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Welcome to the institution. Complete the activation setup below to initialize your account.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {isSuccess ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Account Successfully Activated!
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your institutional account has been initialized and verified. You can now sign in using your email and password.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
          >
            <span>Proceed to Institutional Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Token Input & Fetch */}
          <div>
            <label
              htmlFor="activate-token"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Activation Token
            </label>
            <div className="flex gap-2">
              <input
                id="activate-token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onBlur={handleTokenBlur}
                placeholder="Paste invitation token"
                className="flex-1 h-10 rounded-xl border border-input bg-background px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => fetchDetails(token)}
                disabled={isFetchingDetails || !token.trim()}
                className="px-3 h-10 rounded-xl border border-border bg-muted/60 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {isFetchingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
              </button>
            </div>
          </div>

          {/* Invitation Metadata Card */}
          {details && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{details.email}</span>
                <span className="rounded bg-primary/20 px-2 py-0.5 font-bold text-[10px] text-primary">
                  {details.role}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>{details.schoolName}</span>
              </div>
            </div>
          )}

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="first-name"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="first-name"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="last-name"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="last-name"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Password Fields */}
          <div>
            <label
              htmlFor="activate-password"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Choose Account Password (min 8 characters)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="activate-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="activate-confirm-password"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Confirm Account Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="activate-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Activating Account Profile...</span>
              </>
            ) : (
              <>
                <span>Complete Activation & Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ActivatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card/30 to-background flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Institutional Header */}
      <header className="flex items-center justify-between max-w-4xl w-full mx-auto">
        <Link href="/login" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <School className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">
              Educational Management System
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium">
              Institutional Security &bull; Account Activation
            </p>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="max-w-md w-full mx-auto my-8">
        <React.Suspense
          fallback={
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-xs text-muted-foreground">
              Loading activation portal...
            </div>
          }
        >
          <ActivateAccountContent />
        </React.Suspense>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto pt-6 border-t border-border text-center text-xs text-muted-foreground">
        Educational Management System &bull; Controlled Invitation Protocol
      </footer>
    </div>
  );
}
