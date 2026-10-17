'use client';

/**
 * MODULE: Institutional Password Recovery - Request Reset
 *
 * PURPOSE:
 * Allows institutional users to request an expiring, single-use password reset link.
 * Implements security guidelines: generic response that never confirms or denies account existence.
 *
 * DEPENDENCIES:
 * apiClient, ThemeToggle, lucide-react
 */

import * as React from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  School,
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [devToken, setDevToken] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setDevToken(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your institutional email address.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.post<any>('/auth/forgot-password', {
        email: email.trim(),
      });

      setIsSubmitted(true);
      if (res.devToken) {
        setDevToken(res.devToken);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to process recovery request. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

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
              Institutional Security &bull; Password Recovery
            </p>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="max-w-md w-full mx-auto my-8">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl shadow-foreground/5">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
              <KeyRound className="h-3.5 w-3.5" />
              Account Security Recovery
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Reset Your Password
            </h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Enter your registered institutional email address. If an active account matches, we will issue a secure, single-use reset link.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {isSubmitted ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Request Dispatched
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  If an account exists for <span className="font-semibold text-foreground">{email}</span>, a secure one-time password reset token has been generated with a 1-hour expiration window.
                </p>
              </div>

              {devToken && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="h-4 w-4" />
                    Development Mode Token Detected
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Because this environment is in development mode, you can immediately proceed to the reset page using this generated token:
                  </p>
                  <Link
                    href={`/reset-password?token=${devToken}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-xs text-primary underline"
                  >
                    <span>Proceed to Reset Password &rarr;</span>
                  </Link>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Return to Institutional Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="recovery-email"
                  className="block text-xs font-semibold text-foreground mb-1.5"
                >
                  Registered Institutional Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. user@institution.edu"
                    className="w-full h-11 rounded-xl border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
                    <span>Processing Request...</span>
                  </>
                ) : (
                  <>
                    <span>Request Password Recovery Link</span>
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
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto pt-6 border-t border-border text-center text-xs text-muted-foreground">
        Educational Management System &bull; Single-Use Secure Reset Protocol
      </footer>
    </div>
  );
}
