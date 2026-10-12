'use client';

/**
 * MODULE: Institutional Login Page
 *
 * PURPOSE:
 * Secure authentication portal for institutional staff, students, and parents.
 * Features 1-click test credential fill buttons for all 5 RBAC roles.
 *
 * DEPENDENCIES:
 * useAuth, UserRole, lucide-react
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  GraduationCap,
  Shield,
  School,
  BookOpen,
  UserCheck,
  Users,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface QuickAccount {
  role: UserRole;
  title: string;
  name: string;
  email: string;
  scope: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const DEMO_ACCOUNTS: QuickAccount[] = [
  {
    role: UserRole.PLATFORM_ADMIN,
    title: 'Platform Admin',
    name: 'Alexander Vance',
    email: 'platform.admin@ems.local',
    scope: 'Universal Superintendent',
    icon: Shield,
    color: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
  },
  {
    role: UserRole.SCHOOL_ADMIN,
    title: 'School Admin',
    name: 'Eleanor Pemberton',
    email: 'admin@stjude.ems.local',
    scope: 'Principal / Registrar',
    icon: School,
    color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
  },
  {
    role: UserRole.TEACHER,
    title: 'Teacher',
    name: 'Marcus Holloway',
    email: 'teacher@stjude.ems.local',
    scope: 'Faculty & Curriculum',
    icon: BookOpen,
    color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    role: UserRole.STUDENT,
    title: 'Student',
    name: 'Liam Chen',
    email: 'student@stjude.ems.local',
    scope: 'Enrolled Academic Portal',
    icon: GraduationCap,
    color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  },
  {
    role: UserRole.PARENT,
    title: 'Parent',
    name: 'Sarah Chen',
    email: 'parent@stjude.ems.local',
    scope: 'Guardian Academic Monitor',
    icon: Users,
    color: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('Password123!');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = async (acc: QuickAccount, autoSubmit = false) => {
    setEmail(acc.email);
    setPassword('Password123!');
    setErrorMessage(null);

    if (autoSubmit) {
      setIsLoading(true);
      try {
        await login(acc.email, 'Password123!');
        router.push('/');
      } catch (err: any) {
        setErrorMessage(err.message || 'Quick login failed.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card/50 to-background flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">
              Educational Management System
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium">
              St. Jude Institutional Academy &bull; Academic Portal
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="max-w-5xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Login Form */}
        <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl shadow-foreground/5">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Shield className="h-3.5 w-3.5" />
              Institutional Authentication
            </span>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter your institutional credentials to access your portal.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email-input"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Institutional Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@stjude.ems.local"
                  className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password-input"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password-input"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              id="submit-login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full h-10 mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Session...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Institutional Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Enterprise Multi-Tenant Node</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              PostgreSQL 18 Connected
            </span>
          </div>
        </div>

        {/* Right Column: 1-Click Role Fast-Fill Panel */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Development Fast-Access Matrix
            </div>
            <h3 className="mt-1 text-lg font-bold text-foreground">
              Select an Institutional Test Account
            </h3>
            <p className="text-xs text-muted-foreground">
              Click any role to autofill and authenticate with the database-seeded credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <div
                  key={acc.role}
                  className="group relative rounded-xl border border-border bg-card p-3.5 hover:border-primary/50 hover:shadow-md transition-all text-left flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg border ${acc.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          {acc.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {acc.name}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-border/50 text-[11px]">
                    <div className="font-mono text-muted-foreground truncate">
                      {acc.email}
                    </div>
                    <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                      Scope: {acc.scope}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickFill(acc, false)}
                      className="flex-1 py-1.5 px-2 rounded-lg border border-border bg-background text-[11px] font-semibold text-foreground hover:bg-muted transition-colors text-center"
                    >
                      Fill Form
                    </button>
                    <button
                      type="button"
                      id={`fast-login-${acc.role.toLowerCase()}`}
                      onClick={() => handleQuickFill(acc, true)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-primary/10 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all text-center flex items-center justify-center gap-1"
                    >
                      <span>1-Click In</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Test Password: </span>
            <code className="rounded bg-background px-1.5 py-0.5 text-xs font-mono font-bold text-foreground border border-border">
              Password123!
            </code>
            <span className="ml-2">
              (All 5 accounts share this bcrypt-hashed credential, configured in database seed).
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-border text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          Educational Management System &bull; Version 0.1.0 &bull; TASK 002 Auth & RBAC
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>School Isolation Guard Enabled</span>
          <span>&bull;</span>
          <span>JWT Access (1h) / Refresh (7d)</span>
        </div>
      </footer>
    </div>
  );
}
