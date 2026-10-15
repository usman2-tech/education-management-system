'use client';

/**
 * MODULE: Institutional Authentication Portal
 *
 * PURPOSE:
 * Modern, professional two-panel authentication layout:
 * - LEFT PANEL: Institutional branding, greeting, and 5-role selection grid (2-2-1).
 * - RIGHT PANEL: Dynamic selected-portal indicator, credentials form, password toggle,
 *   remember me, forgot password, and account activation.
 *
 * DEPENDENCIES:
 * useAuth, UserRole, ThemeToggle, lucide-react
 *
 * SECURITY:
 * Role selection prepares credentials context; access permissions are strictly enforced
 * by NestJS JWT verification and school-tenant scoped RBAC.
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
  const [rememberMe, setRememberMe] = React.useState(false);
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
        className={`group text-left rounded-xl p-3 sm:p-3.5 transition-all duration-150 border flex items-center justify-between gap-2.5 h-full ${
          isSelected
            ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
            : 'border-border bg-card/60 hover:border-primary/40 hover:bg-card hover:shadow-xs'
        } ${extraClassName}`}
        aria-pressed={isSelected}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isSelected
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-primary/10'
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
          <div className="h-4 w-4 rounded-full border border-border/80 shrink-0 group-hover:border-primary/40" />
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar with System Status & Theme Toggle */}
      <header className="w-full max-w-[1100px] mx-auto flex items-center justify-between pb-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Institutional Portal Online</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Two-Panel Login Container */}
      <main className="w-full max-w-[1100px] mx-auto my-auto">
        <div className="w-full rounded-3xl border border-border bg-card shadow-2xl shadow-foreground/5 overflow-hidden flex flex-col lg:flex-row">
          
          {/* LEFT PANEL: Branding & Role Selection (approx 55% width) */}
          <div className="w-full lg:w-[55%] p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-muted/15 lg:border-r border-border">
            <div className="space-y-6">
              {/* Institutional Branding */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                  <School className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-tight">
                    Samahat Taibah Group
                  </h1>
                  <p className="text-xs text-muted-foreground font-medium">
                    Educational Management System
                  </p>
                </div>
              </div>

              {/* Portal Selection Heading */}
              <div className="space-y-1 pt-1">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Choose Your Academic Portal
                </h2>
                <p className="text-xs text-muted-foreground">
                  Select your institutional role to continue.
                </p>
              </div>

              {/* Five Role Cards: 2 - 2 - 1 Arrangement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Row 1: Platform Admin | School Admin */}
                {renderRoleCard(ROLE_PORTALS[0])}
                {renderRoleCard(ROLE_PORTALS[1])}

                {/* Row 2: Teacher | Student */}
                {renderRoleCard(ROLE_PORTALS[2])}
                {renderRoleCard(ROLE_PORTALS[3])}

                {/* Row 3: Parent / Guardian — Full-width spanning both columns */}
                {renderRoleCard(ROLE_PORTALS[4], 'sm:col-span-2 w-full')}
              </div>
            </div>

            {/* Left Panel Security Badge */}
            <div className="pt-6 mt-6 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>Enterprise RBAC Isolation</span>
              </div>
              <span>v1.0 Institutional Release</span>
            </div>
          </div>

          {/* RIGHT PANEL: Sign-In Form & Authentication (approx 45% width) */}
          <div className="w-full lg:w-[45%] p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-card">
            <div className="w-full max-w-md mx-auto space-y-5">
              
              {/* Form Header */}
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold tracking-tight text-foreground">
                  Sign In
                </h3>
                <p className="text-xs text-muted-foreground">
                  Access your academic portal with your institutional credentials.
                </p>
              </div>

              {/* Selected Portal Indicator */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                    <activePortal.icon className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                      Selected Portal
                    </div>
                    <div className="text-xs font-bold text-foreground truncate">
                      {activePortal.title}
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  Active
                </span>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Authentication Form */}
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

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary/20 cursor-pointer"
                    />
                    <span>Remember this device</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button
                  id="submit-login-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to {activePortal.title}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider with "OR" */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative bg-card px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  or
                </div>
              </div>

              {/* Account Activation Invitation Callout */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Have an invitation?{' '}
                  <Link
                    href="/activate"
                    className="font-bold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span>Activate account</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Institutional Legal & Security Footer */}
      <footer className="w-full max-w-[1100px] mx-auto pt-4 text-center text-[11px] text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-1.5">
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
