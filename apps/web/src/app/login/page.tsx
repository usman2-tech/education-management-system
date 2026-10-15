'use client';

/**
 * MODULE: Institutional Authentication Portal
 *
 * PURPOSE:
 * Secure, multi-role entry portal for institutional administrators, school leaders,
 * faculty members, enrolled students, and verified parent guardians.
 * Features a compact, centered 2-column role selection layout with single email/password form directly below.
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
} from 'lucide-react';

interface RolePortalCard {
  role: UserRole;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_PORTALS: RolePortalCard[] = [
  {
    role: UserRole.PLATFORM_ADMIN,
    title: 'Platform Administrator',
    subtitle: 'System & Institutional Governance',
    icon: Shield,
  },
  {
    role: UserRole.SCHOOL_ADMIN,
    title: 'School Administrator',
    subtitle: 'Campus Operations & Enrollment',
    icon: School,
  },
  {
    role: UserRole.TEACHER,
    title: 'Teacher',
    subtitle: 'Instruction & Gradebook',
    icon: BookOpen,
  },
  {
    role: UserRole.STUDENT,
    title: 'Student',
    subtitle: 'Academic Learning Portal',
    icon: GraduationCap,
  },
  {
    role: UserRole.PARENT,
    title: 'Parent / Guardian',
    subtitle: 'Guardian Academic Monitor',
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
      setErrorMessage(
        err.message || 'Authentication failed. Please verify your credentials and selected portal.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const activePortal = ROLE_PORTALS.find((p) => p.role === selectedRole) || ROLE_PORTALS[1];

  const renderRoleCard = (portal: RolePortalCard, extraClassName = '') => {
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
        className={`group text-left rounded-xl p-3 transition-all duration-150 border flex items-center justify-between gap-3 ${
          isSelected
            ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
            : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
        } ${extraClassName}`}
        aria-pressed={isSelected}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isSelected
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground group-hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-foreground truncate leading-tight">
              {portal.title}
            </div>
            <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
              {portal.subtitle}
            </div>
          </div>
        </div>
        {isSelected ? (
          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <div className="h-4 w-4 rounded-full border border-border shrink-0" />
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card/30 to-background flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Institutional Header */}
      <header className="flex items-center justify-between max-w-xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <School className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">
              Samahat Taibah Group
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium">
              Educational Management System &bull; Secure Portal
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Centered Content */}
      <main className="max-w-xl w-full mx-auto my-6 space-y-5">
        {/* Portal Greeting */}
        <div className="text-center space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            <Shield className="h-3 w-3" />
            Institutional Identity & Access
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Sign In to Your Academic Portal
          </h2>
          <p className="text-xs text-muted-foreground">
            Select your assigned role portal and enter your credentials.
          </p>
        </div>

        {/* 2-Column Responsive Role Selection Grid */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
            Select Role Portal
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Row 1: Platform Admin | School Admin */}
            {renderRoleCard(ROLE_PORTALS[0])}
            {renderRoleCard(ROLE_PORTALS[1])}

            {/* Row 2: Teacher | Student */}
            {renderRoleCard(ROLE_PORTALS[2])}
            {renderRoleCard(ROLE_PORTALS[3])}

            {/* Row 3: Parent / Guardian (Centered) */}
            <div className="sm:col-span-2 flex justify-center">
              {renderRoleCard(ROLE_PORTALS[4], 'w-full sm:w-[calc(50%-5px)]')}
            </div>
          </div>
        </div>

        {/* Shared Email / Password Authentication Form */}
        <div className="w-full bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-xl shadow-foreground/5">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <activePortal.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Signing into
                </div>
                <div className="text-xs font-bold text-foreground">
                  {activePortal.title} Portal
                </div>
              </div>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
              Active Portal
            </span>
          </div>

          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
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
                  className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
                  className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
              className="w-full h-10 mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
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
          <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 text-[11px]">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              Received an invitation token?
            </span>
            <Link
              href="/activate"
              className="font-bold text-primary hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>Activate Your Account</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </main>

      {/* Institutional Legal & Security Footer */}
      <footer className="max-w-xl w-full mx-auto pt-4 border-t border-border text-center text-[11px] text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-1.5">
        <div>
          Educational Management System &bull; Enterprise Institutional Platform
        </div>
        <div className="flex items-center gap-3">
          <span>Role-Based Access Control</span>
          <span>&bull;</span>
          <span>School Tenant Isolation</span>
        </div>
      </footer>
    </div>
  );
}
