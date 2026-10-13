'use client';

/**
 * MODULE: Grades & Academic Performance - Central Dashboard
 *
 * PURPOSE:
 * Role-aware dashboard for assessment overviews, gradebook entries,
 * student report cards, parent progress trackers, and academic performance KPIs.
 *
 * SECURITY:
 * Scoped by authenticated user role and school tenancy.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  UserRole,
  AssessmentDto,
  AssessmentStatus,
  StudentAcademicSummaryDto,
  ParentDashboardSummaryDto,
  RelationshipVerificationStatus,
} from '@ems/contracts';
import {
  fetchAssessments,
  fetchStudentAcademicSummary,
} from '@/lib/grades-api';
import { fetchParentDashboard } from '@/lib/parents-api';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Sliders,
  TrendingUp,
  Users,
} from 'lucide-react';
import { StudentTrendLineChart } from '@/components/grades/grade-charts';

export default function GradesDashboardPage() {
  const router = useRouter();
  const { user, effectiveRole } = useAuth();

  const isStaff =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN ||
    effectiveRole === UserRole.TEACHER;
  const isStudent = effectiveRole === UserRole.STUDENT;
  const isParent = effectiveRole === UserRole.PARENT;

  // Staff state
  const [assessments, setAssessments] = React.useState<AssessmentDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Student state
  const [studentSummary, setStudentSummary] = React.useState<StudentAcademicSummaryDto | null>(null);

  // Parent state
  const [parentSummary, setParentSummary] = React.useState<ParentDashboardSummaryDto | null>(null);
  const [selectedChildId, setSelectedChildId] = React.useState<string | null>(null);
  const [childSummary, setChildSummary] = React.useState<StudentAcademicSummaryDto | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      if (isStaff) {
        const data = await fetchAssessments();
        setAssessments(data);
      } else if (isStudent && user) {
        const summary = await fetchStudentAcademicSummary(user.id);
        setStudentSummary(summary);
      } else if (isParent) {
        const pDash = await fetchParentDashboard();
        setParentSummary(pDash);
        const verified = pDash.students.filter(
          (s) => s.verificationStatus === RelationshipVerificationStatus.VERIFIED,
        );
        if (verified.length > 0) {
          const firstChild = verified[0].id;
          setSelectedChildId(firstChild);
          const cSummary = await fetchStudentAcademicSummary(firstChild);
          setChildSummary(cSummary);
        }
      }
    } catch (err) {
      console.error('Failed to load grades dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, [isStaff, isStudent, isParent, user]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChildChange = async (childId: string) => {
    setSelectedChildId(childId);
    try {
      const cSummary = await fetchStudentAcademicSummary(childId);
      setChildSummary(cSummary);
    } catch (err) {
      console.error('Failed to load child academic summary', err);
    }
  };

  // Staff Stats
  const totalAssessments = assessments.length;
  const publishedCount = assessments.filter((a) => a.status === AssessmentStatus.PUBLISHED).length;
  const draftCount = assessments.filter((a) => a.status === AssessmentStatus.DRAFT).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Grades & Academic Performance
          </h1>
          <p className="text-sm text-muted-foreground">
            {isStaff && 'Manage assessments, gradebooks, weighted calculations, and institutional reports.'}
            {isStudent && 'Your academic performance, cumulative GPA, subject grades, and faculty feedback.'}
            {isParent && 'Track verified student grades, term report cards, and academic progress.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {isStaff && (
            <>
              <Link
                href="/grades/reports"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                Performance Reports
              </Link>
              <Link
                href="/grades/assessments/new"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                New Assessment
              </Link>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* STAFF VIEW (Platform Admin, School Admin, Teacher) */}
          {/* ========================================================================= */}
          {isStaff && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Total Assessments</span>
                    <BookOpen className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-foreground">{totalAssessments}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Curriculum evaluations</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Published</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {publishedCount}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Visible to students & parents</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">In Draft (Pending)</span>
                    <Clock className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {draftCount}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Awaiting grading or final approval</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Quick Management</span>
                    <Layers className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Link
                      href="/grades/categories"
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Categories
                    </Link>
                    <span className="text-muted-foreground">•</span>
                    <Link
                      href="/grades/scales"
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Grading Scales
                    </Link>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Weights & GPA scale config</div>
                </div>
              </div>

              {/* Recent Assessments Section */}
              <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Active Assessments</h2>
                    <p className="text-xs text-muted-foreground">
                      Select an assessment to enter marks, update feedback, or publish results.
                    </p>
                  </div>
                  <Link
                    href="/grades/assessments"
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    View All Assessments <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {assessments.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No assessments found. Click &quot;New Assessment&quot; to create one.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {assessments.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/40 transition-colors gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{item.title}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                item.status === AssessmentStatus.PUBLISHED
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                              }`}
                            >
                              {item.status}
                            </span>
                            {item.category && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {item.category.name} ({item.category.weightPercentage}%)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                            <span>Subject: <strong>{item.subject?.name || 'Assigned'}</strong></span>
                            <span>Class: <strong>{item.classSection?.name || 'Roster'}</strong></span>
                            <span>Max Marks: <strong>{item.maximumMarks}</strong></span>
                            <span>Date: {new Date(item.assessmentDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/grades/assessments/${item.id}/gradebook`}
                            className="inline-flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                          >
                            <Award className="h-3.5 w-3.5" />
                            Open Gradebook
                          </Link>
                          <Link
                            href={`/grades/assessments/${item.id}`}
                            className="inline-flex items-center rounded-md border border-input p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            title="Details"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STUDENT VIEW */}
          {/* ========================================================================= */}
          {isStudent && studentSummary && (
            <div className="space-y-6">
              {/* Summary Banner */}
              <div className="rounded-xl border border-border bg-gradient-to-r from-card to-card/60 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Academic Standing
                    </span>
                    <h2 className="text-2xl font-bold text-foreground">
                      {studentSummary.studentName}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Class: {studentSummary.className} — {studentSummary.sectionName} • School: {studentSummary.schoolName}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-extrabold text-foreground">
                        {studentSummary.gpa ?? 'N/A'}
                      </div>
                      <div className="text-[11px] font-medium text-muted-foreground">Cumulative GPA</div>
                    </div>
                    <div className="h-10 w-[1px] bg-border" />
                    <div className="text-center">
                      <div className="text-3xl font-extrabold text-primary">
                        {studentSummary.overallPercentage ?? 0}%
                      </div>
                      <div className="text-[11px] font-medium text-muted-foreground">
                        Overall ({studentSummary.letterGrade ?? '—'})
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subject Breakdown & Trend Line */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Subject Cards */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Subject-wise Standing
                  </h3>
                  <div className="space-y-2">
                    {studentSummary.subjects.map((sub) => (
                      <div
                        key={sub.subjectId}
                        className="rounded-lg border border-border bg-card p-3 shadow-sm flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-foreground">{sub.subjectName}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {sub.completedAssessments} of {sub.totalAssessments} assessment{sub.totalAssessments === 1 ? '' : 's'} graded
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-foreground">{sub.overallPercentage ?? 0}%</span>
                          {sub.letterGrade && (
                            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                              {sub.letterGrade}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress Trend Chart */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-indigo-500" />
                      Assessment Performance Trend
                    </h3>
                    <Link
                      href={`/grades/students/${user?.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Full Report Card
                    </Link>
                  </div>
                  <StudentTrendLineChart
                    points={studentSummary.trend.map((g) => ({
                      title: g.assessmentTitle,
                      date: g.date,
                      percentage: g.percentage,
                    }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PARENT VIEW */}
          {/* ========================================================================= */}
          {isParent && parentSummary && (
            <div className="space-y-6">
              {/* Children Tabs */}
              {(() => {
                const verifiedChildren = parentSummary.students.filter(
                  (s) => s.verificationStatus === RelationshipVerificationStatus.VERIFIED,
                );
                return verifiedChildren.length > 0 ? (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Select Verified Child
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {verifiedChildren.map((child) => {
                        const isSelected = selectedChildId === child.id;
                        return (
                          <button
                            key={child.id}
                            onClick={() => handleChildChange(child.id)}
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all border ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-card text-foreground border-border hover:bg-accent'
                            }`}
                          >
                            {child.firstName} {child.lastName} ({child.currentSection?.name ? `Section ${child.currentSection.name}` : 'Student'})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    No verified child relationships found on your account.
                  </div>
                );
              })()}

              {/* Child Standing */}
              {childSummary && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Child Report Card
                      </span>
                      <h3 className="text-2xl font-bold text-foreground">
                        {childSummary.studentName}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Class: {childSummary.className} — {childSummary.sectionName} • School: {childSummary.schoolName}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-extrabold text-foreground">
                          {childSummary.gpa ?? 'N/A'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">GPA</div>
                      </div>
                      <div className="h-10 w-[1px] bg-border" />
                      <div className="text-center">
                        <div className="text-3xl font-extrabold text-primary">
                          {childSummary.overallPercentage ?? 0}%
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Overall ({childSummary.letterGrade ?? '—'})
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trend chart & full report card link */}
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Performance Trend
                      </h4>
                      {selectedChildId && (
                        <Link
                          href={`/grades/students/${selectedChildId}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Open Detailed Academic Card →
                        </Link>
                      )}
                    </div>
                    <StudentTrendLineChart
                      points={childSummary.trend.map((g) => ({
                        title: g.assessmentTitle,
                        date: g.date,
                        percentage: g.percentage,
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
