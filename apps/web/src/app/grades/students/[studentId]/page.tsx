'use client';

/**
 * MODULE: Grades & Academic Performance - Student Report Card
 *
 * PURPOSE:
 * Comprehensive individual academic report card displaying overall GPA,
 * subject-wise mastery, historical assessment timeline, teacher feedback, and progress trends.
 *
 * SECURITY:
 * Accessible to student themselves, verified parents, faculty, and administrators.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  StudentAcademicSummaryDto,
  StudentAssessmentGradeDto,
} from '@ems/contracts';
import {
  fetchStudentAcademicSummary,
  fetchStudentGrades,
} from '@/lib/grades-api';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  Printer,
  TrendingUp,
} from 'lucide-react';
import { StudentTrendLineChart } from '@/components/grades/grade-charts';

export default function StudentGradesReportPage() {
  const params = useParams();
  const studentId = params?.studentId as string;
  const { user } = useAuth();

  const [summary, setSummary] = React.useState<StudentAcademicSummaryDto | null>(null);
  const [grades, setGrades] = React.useState<StudentAssessmentGradeDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [sum, grds] = await Promise.all([
        fetchStudentAcademicSummary(studentId),
        fetchStudentGrades(studentId),
      ]);
      setSummary(sum);
      setGrades(grds);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load student academic report.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (errorMsg || !summary) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center text-sm text-destructive">
        {errorMsg || 'Student academic report not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/grades"
            className="rounded-lg border border-border p-2 hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              Academic Report Card
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official institutional record of student evaluations and continuous assessment.
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-accent transition-colors print:hidden"
        >
          <Printer className="h-3.5 w-3.5 text-primary" />
          Print Report Card
        </button>
      </div>

      {/* Student Profile & Standing Banner */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Student Information
            </span>
            <h2 className="text-2xl font-extrabold text-foreground">{summary.studentName}</h2>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-4 pt-1">
              <span>
                Class: <strong className="text-foreground">{summary.className} — {summary.sectionName}</strong>
              </span>
              <span>
                Institution: <strong className="text-foreground">{summary.schoolName}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-6">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-foreground">
                {summary.gpa ?? 'N/A'}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground">Cumulative GPA</div>
            </div>

            <div className="h-10 w-[1px] bg-border" />

            <div className="text-center">
              <div className="text-3xl font-extrabold text-primary">{summary.overallPercentage ?? 0}%</div>
              <div className="text-[11px] font-medium text-muted-foreground">
                Overall ({summary.letterGrade ?? '—'})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Trend Chart */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Continuous Assessment Trend
        </h3>
        <StudentTrendLineChart
          points={summary.trend.map((g) => ({
            title: g.assessmentTitle,
            date: g.date,
            percentage: g.percentage,
          }))}
        />
      </div>

      {/* Subject Standing Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Subject-wise Mastery
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.subjects.map((sub) => (
            <div
              key={sub.subjectId}
              className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-foreground">{sub.subjectName}</span>
                  {sub.letterGrade && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-extrabold text-foreground">
                      {sub.letterGrade}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-2xl font-bold text-primary">{sub.overallPercentage ?? 0}%</div>
              </div>
              <div className="mt-3 text-[11px] text-muted-foreground border-t border-border pt-2">
                {sub.completedAssessments} of {sub.totalAssessments} assessment{sub.totalAssessments === 1 ? '' : 's'} factored
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assessment History Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Detailed Assessment History</h3>
          <p className="text-xs text-muted-foreground">
            Itemized breakdown of all completed quizzes, assignments, and examinations.
          </p>
        </div>

        {grades.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No published grades available for this student.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Assessment</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                  <th className="py-3 px-4">Teacher Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grades.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">
                      {item.assessmentTitle}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {item.subjectName}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {item.categoryName || 'General'}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-foreground">
                      {item.marksObtained !== null ? `${item.marksObtained} / ${item.maximumMarks}` : 'Missing'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-primary">
                      {item.percentage}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                        {item.letterGrade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground italic">
                      {item.feedback || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
