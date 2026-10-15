'use client';

/**
 * MODULE: Institutional Authentication Portal
 *
 * PURPOSE:
 * Secure, multi-role entry portal for institutional administrators, school leaders,
 * faculty members, enrolled students, and verified parent guardians.
 * Enforces role-portal alignment without granting frontend privilege escalation.
 *
 * DEPENDENCIES:
 * useAuth, UserRole, ThemeToggle, lucide-react
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Shield,
  School,
  BookOpen,
  GraduationCap,
  Users,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle,
  KeyRound,
  UserCheck,
} from 'lucide-react';

interface RolePortalCard {
  role: UserRole;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_PORTALS: RolePortalCard[] = [
  {
    role: UserRole.PLATFORM_ADMIN,
    title: 'Platform Administrator',
    subtitle: 'System & Multi-Tenant Governance',
    description: 'System configurations, institutional tenants, and platform security oversight.',
    icon: Shield,
  },
  {
    role: UserRole.SCHOOL_ADMIN,
    title: 'School Administrator',
    subtitle: 'Campus Operations & Enrollment',
    description: 'Academic calendars, student enrollment, staff assignments, and campus management.',
    icon: School,
  },
  {
    role: UserRole.TEACHER,
    title: 'Teacher',
    subtitle: 'Instruction & Gradebook',
    description: 'Class timetables, attendance tracking, lesson plans, exams, and grading.',
    icon: BookOpen,
  },
  {
    role: UserRole.STUDENT,
    title: 'Student',
    subtitle: 'Academic Learning Portal',
    description: 'Course materials, timetable schedules, homework submissions, and grade reports.',
    icon: GraduationCap,
  },
  {
    role: UserRole.PARENT,
    title: 'Parent / Guardian',
    subtitle: 'Guardian Academic Monitor',
    description: 'Student academic progress, attendance reports, announcements, and direct messaging.',
    icon: Users,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const [selectedRole, setSelectedRole] = React.useState<UserRole>(UserRole.SCHOOL_ADMIN);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
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

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both institutional email and account password.');
      return;
    }

    setIsLoading(true);

    try {
      await login(email.trim(), password, selectedRole);
      router.push('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials and selected portal.');
    } finally {
      setIsLoading(false);
    }
  };

  const activePortal = ROLE_PORTALS.find((p) => p.role === selectedRole) || ROLE_PORTALS[1];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card/30 to-background flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Institutional Header */}
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <School className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
              Samahat Taibah Group
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium sm:text-xs">
              Educational Management System &bull; Secure Institutional Portal
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Authentication Section */}
      <main className="max-w-6xl w-full mx-auto my-6 lg:my-10 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Shield className="h-3.5 w-3.5" />
            Institutional Identity & Access Management
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Sign In to Your Academic Portal
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Select your assigned institutional role below and enter your authorized credentials.
          </p>
        </div>

        {/* Five Selectable Role Cards */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center sm:text-left">
            Step 1: Choose Your Institutional Portal
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {ROLE_PORTALS.map((portal) => {
              const Icon = portal.icon;
              const isSelected = selectedRole === portal.role;
              return (
                <button
                  key={portal.role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(portal.role);
                    setErrorMessage(null);
                  }}
                  className={`group relative text-left rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/20'
                      : 'border-border bg-card/60 hover:border-primary/40 hover:bg-card/90'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted text-muted-foreground group-hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-foreground">
                      {portal.title}
                    </div>
                    <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                      {portal.subtitle}
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-border/50 text-[10px] text-muted-foreground/80 leading-snug">
                    {portal.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shared Email / Password Authentication Form */}
        <div className="max-w-xl mx-auto w-full bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl shadow-foreground/5">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-border">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <activePortal.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                Authenticating as:
              </div>
              <div className="text-sm font-bold text-foreground">
                {activePortal.title}
              </div>
            </div>
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
                  placeholder="name@institution.edu"
                  autoComplete="email"
                  className="w-full h-11 rounded-xl border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password-input"
                  className="block text-xs font-semibold text-foreground"
                >
                  Account Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full h-11 rounded-xl border border-input bg-background pl-9 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
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
              className="w-full h-11 mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials & Permissions...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {activePortal.title}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Account Activation Callout */}
          <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              Received an institutional invitation?
            </span>
            <Link
              href="/activate"
              className="font-bold text-primary hover:underline flex items-center gap-1 text-xs"
            >
              <span>Activate Your Account</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </main>

      {/* Institutional Legal & Security Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-border text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          Educational Management System &bull; Enterprise Institutional Platform
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Role-Based Access Control</span>
          <span>&bull;</span>
          <span>School Tenant Isolation</span>
          <span>&bull;</span>
          <span>AES-256 Encrypted Sessions</span>
        </div>
      </footer>
    </div>
  );
}
