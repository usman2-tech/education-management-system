'use client';

/**
 * MODULE: Institutional Multi-Role Dashboard Overview (TASK 016)
 *
 * PURPOSE:
 * Central landing workspace for the Educational Management System ERP.
 * Dynamically switches role-specific analytics and visualizations using
 * 100% REAL DATABASE DATA:
 * - Platform Admin: Tenants, Enrollments, Subscriptions, Audit Logs
 * - School Admin: Campus KPIs, Attendance, Grade Distribution, Exams
 * - Teacher: Timetable, Homework Reviews, Pending Grading, Messages
 * - Student: Attendance, GPA, Timetable, Deadlines, Course Progress
 * - Parent: Family Overview, Child Progress, Announcements
 *
 * ZERO FABRICATION DIRECTIVE:
 * Displays only authentic database records. Real empty states if empty.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import {
  fetchPlatformAdminDashboard,
  fetchSchoolAdminDashboard,
  fetchTeacherDashboard,
  fetchStudentDashboard,
} from '@/lib/dashboards-api';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { DashboardKpiCard } from '@/components/dashboard/dashboard-kpi-card';
import {
  AttendanceTrendChart,
  EnrollmentTrendChart,
  GradeDistributionChart,
  SubjectPerformanceChart,
  SchoolComparisonTable,
  DonutMetricChart,
} from '@/components/dashboard/dashboard-charts';
import {
  Building2,
  Users,
  GraduationCap,
  Briefcase,
  UserCheck,
  CreditCard,
  Clock,
  BookOpen,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  MessageSquare,
  Shield,
  Loader2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);
      try {
        if (user?.role === UserRole.PLATFORM_ADMIN) {
          const res = await fetchPlatformAdminDashboard();
          setData(res);
        } else if (user?.role === UserRole.SCHOOL_ADMIN) {
          const res = await fetchSchoolAdminDashboard();
          setData(res);
        } else if (user?.role === UserRole.TEACHER) {
          const res = await fetchTeacherDashboard();
          setData(res);
        } else if (user?.role === UserRole.STUDENT) {
          const res = await fetchStudentDashboard();
          setData(res);
        } else if (user?.role === UserRole.PARENT) {
          router.replace('/parent/dashboard');
          return;
        }
      } catch (err: any) {
        console.error('Failed to load dashboard:', err);
        setError(err.message || 'Failed to load institutional dashboard.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
        <h3 className="text-base font-semibold text-foreground">Dashboard Aggregation Error</h3>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  // ============================================================================
  // VIEW 1: PLATFORM ADMINISTRATOR DASHBOARD
  // ============================================================================
  if (user?.role === UserRole.PLATFORM_ADMIN && data) {
    return (
      <div className="space-y-6">
        {/* Institutional Banner */}
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary via-primary/95 to-primary/85 p-6 text-primary-foreground shadow-sm sm:p-8">
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent-foreground backdrop-blur-sm">
                <Shield className="h-3.5 w-3.5" />
                Central Administration
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/90">
                Multi-Tenant Oversight
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Platform Institutional Operations
            </h1>
            <p className="mt-2 text-sm text-white/80 leading-relaxed max-w-2xl">
              Centralized platform telemetry governing tenant schools, active licenses,
              institutional student enrollments, and system security logs.
            </p>
          </div>
        </div>

        {/* Top KPI Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardKpiCard
            title="Institutional Schools"
            value={data.totalSchools}
            subtitle={`${data.activeSchools} active campuses`}
            icon={Building2}
            colorScheme="primary"
          />
          <DashboardKpiCard
            title="Enrolled Students"
            value={data.totalStudents}
            subtitle="Cross-school students"
            icon={GraduationCap}
            colorScheme="info"
          />
          <DashboardKpiCard
            title="Faculty & Staff"
            value={data.totalTeachers}
            subtitle="Active faculty members"
            icon={Briefcase}
            colorScheme="neutral"
          />
          <DashboardKpiCard
            title="Active Subscriptions"
            value={data.activeSubscriptions}
            subtitle={`${data.expiredSubscriptions} expired`}
            icon={CreditCard}
            colorScheme={data.activeSubscriptions > 0 ? 'success' : 'warning'}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Enrollment Trends */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Institutional Enrollment Growth (Last 6 Months)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real student and teacher registrations
            </p>
            <div className="mt-4">
              <EnrollmentTrendChart data={data.enrollmentTrends} />
            </div>
          </div>

          {/* Attendance Trends */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Daily Attendance Rate Across Platform
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aggregated from finalized attendance sessions
            </p>
            <div className="mt-4">
              <AttendanceTrendChart points={data.attendanceTrends} />
            </div>
          </div>
        </div>

        {/* School Comparisons Table */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Institutional Tenant Comparisons
              </h3>
              <p className="text-xs text-muted-foreground">
                Real student counts and faculty allocations per school
              </p>
            </div>
            <Link
              href="/schools"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Manage Schools
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3">
            <SchoolComparisonTable schools={data.schoolComparisons} />
          </div>
        </div>

        {/* Recent Audit Events */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">
            Recent System Administrative Audits
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable audit records of critical institutional mutations
          </p>
          <div className="mt-4 divide-y divide-border">
            {data.recentAdministrativeEvents.length === 0 ? (
              <p className="py-4 text-xs text-muted-foreground text-center">
                No recent administrative actions recorded.
              </p>
            ) : (
              data.recentAdministrativeEvents.map((evt: any) => (
                <div key={evt.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-foreground">{evt.action}</span>
                    <span className="ml-2 text-muted-foreground">
                      ({evt.entityType}) by {evt.actorEmail || 'System'}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {new Date(evt.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: SCHOOL ADMINISTRATOR DASHBOARD
  // ============================================================================
  if (user?.role === UserRole.SCHOOL_ADMIN && data) {
    return (
      <div className="space-y-6">
        {/* Campus Banner */}
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary via-primary/95 to-primary/85 p-6 text-primary-foreground shadow-sm sm:p-8">
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent-foreground backdrop-blur-sm">
                <Building2 className="h-3.5 w-3.5" />
                Campus Administration
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/90">
                School Operations
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Campus Academic Overview
            </h1>
            <p className="mt-2 text-sm text-white/80 leading-relaxed max-w-2xl">
              Operational control center for daily attendance, teacher schedules,
              examinations, student grades, and curriculum completion.
            </p>
          </div>
        </div>

        {/* Top KPI Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardKpiCard
            title="Enrolled Students"
            value={data.totalStudents}
            subtitle="Campus enrollment"
            icon={GraduationCap}
            colorScheme="primary"
          />
          <DashboardKpiCard
            title="Faculty & Teachers"
            value={data.totalTeachers}
            subtitle="Active instructional staff"
            icon={Briefcase}
            colorScheme="neutral"
          />
          <DashboardKpiCard
            title="Active Class Sections"
            value={data.activeClasses}
            subtitle="Current academic sections"
            icon={BookOpen}
            colorScheme="info"
          />
          <DashboardKpiCard
            title="Homework Completion"
            value={`${data.homeworkCompletionRate}%`}
            subtitle="Tasks completed on time"
            icon={CheckCircle2}
            colorScheme="success"
          />
        </div>

        {/* Attendance & Grade Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Daily Attendance Donut */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Daily Attendance Rate
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Today's campus-wide presence
              </p>
            </div>
            <div className="py-4">
              <DonutMetricChart
                percentage={data.dailyAttendancePercentage}
                label="Attendance"
                sublabel="Presence percentage from finalized registers"
                color={
                  data.dailyAttendancePercentage >= 80
                    ? 'stroke-emerald-500'
                    : 'stroke-amber-500'
                }
              />
            </div>
            <Link
              href="/attendance"
              className="text-center text-xs font-semibold text-primary hover:underline"
            >
              View Attendance Registers →
            </Link>
          </div>

          {/* Attendance Trend Line */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground">
              Attendance Trend (Recent Sessions)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historical daily student presence rate
            </p>
            <div className="mt-4">
              <AttendanceTrendChart points={data.attendanceTrends} />
            </div>
          </div>
        </div>

        {/* Grade Distribution & Subject Performance */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Grade Distribution
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Letter marks awarded across all published assessments
            </p>
            <div className="mt-2">
              <GradeDistributionChart data={data.gradeDistribution} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Subject Averages
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Average percentage score per academic department
            </p>
            <div className="mt-4">
              <SubjectPerformanceChart data={data.subjectPerformance} />
            </div>
          </div>
        </div>

        {/* Upcoming Exams & Recent Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Upcoming Exams */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-sm font-semibold text-foreground">
                Upcoming Examinations
              </h3>
              <Link href="/exams" className="text-xs font-semibold text-primary hover:underline">
                View All →
              </Link>
            </div>
            <div className="mt-3 divide-y divide-border">
              {data.upcomingExams.length === 0 ? (
                <p className="py-6 text-xs text-muted-foreground text-center">
                  No upcoming examinations scheduled.
                </p>
              ) : (
                data.upcomingExams.map((ex: any) => (
                  <div key={ex.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-foreground">{ex.title}</span>
                      <p className="text-[11px] text-muted-foreground">
                        {ex.subjectName} • {ex.className}
                      </p>
                    </div>
                    <span className="rounded bg-muted px-2 py-0.5 font-medium text-foreground text-[11px]">
                      {new Date(ex.examDate).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Campus Activity */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Recent Campus Activity
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Audit log of teacher and student transactions
            </p>
            <div className="mt-3 divide-y divide-border">
              {data.recentActivity.length === 0 ? (
                <p className="py-6 text-xs text-muted-foreground text-center">
                  No recent activity records.
                </p>
              ) : (
                data.recentActivity.map((act: any) => (
                  <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-foreground">{act.action}</span>
                      <p className="text-[11px] text-muted-foreground">{act.details}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(act.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 3: TEACHER WORKSPACE DASHBOARD
  // ============================================================================
  if (user?.role === UserRole.TEACHER && data) {
    return (
      <div className="space-y-6">
        {/* Teacher Banner */}
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary via-primary/95 to-primary/85 p-6 text-primary-foreground shadow-sm sm:p-8">
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent-foreground backdrop-blur-sm">
              <Briefcase className="h-3.5 w-3.5" />
              Faculty Workspace
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Hello, {user.firstName || 'Teacher'}
            </h1>
            <p className="mt-1.5 text-sm text-white/80">
              Here is your daily instructional agenda, assigned classes, and student submissions
              awaiting review.
            </p>
          </div>
        </div>

        {/* Action Counters */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardKpiCard
            title="Assigned Classes"
            value={data.assignedClassesCount}
            subtitle="Sections taught"
            icon={BookOpen}
            colorScheme="primary"
          />
          <DashboardKpiCard
            title="Pending Attendance"
            value={data.pendingAttendanceCount}
            subtitle="Classes need marking"
            icon={Clock}
            colorScheme={data.pendingAttendanceCount > 0 ? 'warning' : 'success'}
          />
          <DashboardKpiCard
            title="Homework Reviews"
            value={data.pendingHomeworkReviewsCount}
            subtitle="Submissions awaiting review"
            icon={FileText}
            colorScheme={data.pendingHomeworkReviewsCount > 0 ? 'info' : 'neutral'}
          />
          <DashboardKpiCard
            title="Pending Grades"
            value={data.pendingGradingCount}
            subtitle="Assessments need marking"
            icon={Award}
            colorScheme={data.pendingGradingCount > 0 ? 'warning' : 'success'}
          />
        </div>

        {/* Today's Schedule & Messages */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Today's Timetable */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Today's Teaching Schedule
                </h3>
                <p className="text-xs text-muted-foreground">
                  Classroom timetable for today
                </p>
              </div>
              <Link
                href="/timetable"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Full Week →
              </Link>
            </div>

            <div className="mt-3 space-y-3">
              {data.todaySchedule.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  No classes scheduled for today.
                </div>
              ) : (
                data.todaySchedule.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-primary/10 p-2 text-primary font-mono text-xs font-semibold">
                        {entry.startTime} – {entry.endTime}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">
                          {entry.subjectName}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {entry.className} {entry.roomNumber && `• Room ${entry.roomNumber}`}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/attendance"
                      className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Mark Attendance
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions & Recent Messages */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">
                Instructional Quick Actions
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <Link
                  href="/homework/new"
                  className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <span>Assign Homework</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
                <Link
                  href="/exams/new"
                  className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <span>Create Examination</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
                <Link
                  href="/grades/assessments/new"
                  className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <span>New Assessment</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-semibold text-foreground">Recent Messages</h3>
                <Link href="/messages" className="text-xs font-semibold text-primary hover:underline">
                  Inbox →
                </Link>
              </div>
              <div className="mt-2 divide-y divide-border">
                {data.recentMessages.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No recent communications.
                  </p>
                ) : (
                  data.recentMessages.map((msg: any) => (
                    <div key={msg.id} className="py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{msg.senderName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate mt-0.5">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 4: STUDENT LEARNING DASHBOARD
  // ============================================================================
  if (user?.role === UserRole.STUDENT && data) {
    return (
      <div className="space-y-6">
        {/* Student Banner */}
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary via-primary/95 to-primary/85 p-6 text-primary-foreground shadow-sm sm:p-8">
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent-foreground backdrop-blur-sm">
              <GraduationCap className="h-3.5 w-3.5" />
              Student Learning Portal
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome Back, {user.firstName || 'Student'}
            </h1>
            <p className="mt-1.5 text-sm text-white/80">
              Track your classes, submit homework assignments, view upcoming examinations, and
              monitor your grade standing.
            </p>
          </div>
        </div>

        {/* Academic Overview KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardKpiCard
            title="Attendance"
            value={`${data.attendancePercentage}%`}
            subtitle="Presence rate"
            icon={Clock}
            colorScheme={data.attendancePercentage >= 80 ? 'success' : 'warning'}
          />
          <DashboardKpiCard
            title="Current GPA"
            value={data.gpa !== null ? data.gpa : 'N/A'}
            subtitle={data.letterGrade ? `Grade Standing: ${data.letterGrade}` : 'In progress'}
            icon={Award}
            colorScheme="primary"
          />
          <DashboardKpiCard
            title="Pending Homework"
            value={data.pendingHomework.length}
            subtitle="Assignments due soon"
            icon={FileText}
            colorScheme={data.pendingHomework.length > 0 ? 'warning' : 'neutral'}
          />
          <DashboardKpiCard
            title="Upcoming Exams"
            value={data.upcomingExams.length}
            subtitle="Scheduled tests"
            icon={AlertCircle}
            colorScheme="info"
          />
        </div>

        {/* Schedule & Pending Homework */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Today's Schedule */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-sm font-semibold text-foreground">
                Today's Class Schedule
              </h3>
              <Link href="/timetable" className="text-xs font-semibold text-primary hover:underline">
                View Timetable →
              </Link>
            </div>
            <div className="mt-2 space-y-2.5">
              {data.todaySchedule.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  No classes scheduled for today.
                </div>
              ) : (
                data.todaySchedule.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{item.subjectName}</span>
                      <p className="text-[11px] text-muted-foreground">
                        {item.periodName} {item.roomNumber && `• Room ${item.roomNumber}`}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] font-medium text-foreground bg-muted px-2 py-0.5 rounded">
                      {item.startTime} - {item.endTime}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Homework */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-sm font-semibold text-foreground">
                Pending Homework Tasks
              </h3>
              <Link href="/homework" className="text-xs font-semibold text-primary hover:underline">
                All Homework →
              </Link>
            </div>
            <div className="mt-2 space-y-2.5">
              {data.pendingHomework.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  No pending assignments. You are all caught up!
                </div>
              ) : (
                data.pendingHomework.map((hw: any) => (
                  <div
                    key={hw.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{hw.title}</span>
                      <p className="text-[11px] text-muted-foreground">
                        {hw.subjectName} • Due: {new Date(hw.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href={`/homework/${hw.id}`}
                      className="rounded bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Submit
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Results */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Recent Assessment Marks
            </h3>
            <Link href="/grades" className="text-xs font-semibold text-primary hover:underline">
              Full Report Card →
            </Link>
          </div>
          <div className="mt-2 divide-y divide-border">
            {data.recentGrades.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No evaluated grades published yet.
              </p>
            ) : (
              data.recentGrades.map((g: any) => (
                <div key={g.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-foreground">{g.title}</span>
                    <span className="ml-2 text-muted-foreground">{g.subjectName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">
                      {g.marksObtained} / {g.maximumMarks}
                    </span>
                    {g.letterGrade && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {g.letterGrade}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card p-6 text-center">
      <p className="text-sm text-muted-foreground">Please select an active institutional role.</p>
    </div>
  );
}
