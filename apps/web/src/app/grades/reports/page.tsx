'use client';

/**
 * MODULE: Grades & Academic Performance - Class Performance Analytics & Reports
 *
 * PURPOSE:
 * Institutional analytics dashboard providing class-wide subject averages,
 * grade distribution histograms, student rankings, and CSV reporting.
 *
 * SECURITY:
 * Multi-school tenant isolation and RBAC authorization enforced.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  ClassPerformanceReportDto,
  ClassSectionDto,
  SubjectDto,
  UserRole,
} from '@ems/contracts';
import {
  fetchClassPerformance,
  fetchGradesReport,
} from '@/lib/grades-api';
import {
  fetchSections,
  fetchSubjects,
} from '@/lib/classes-api';
import {
  ArrowLeft,
  Award,
  BarChart2,
  BookOpen,
  Calendar,
  Download,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  GradeDistributionChart,
  SubjectPerformanceBarChart,
} from '@/components/grades/grade-charts';

export default function GradesReportsPage() {
  const { user, effectiveRole } = useAuth();
  const isAuthorized =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN ||
    effectiveRole === UserRole.TEACHER;

  const [sections, setSections] = React.useState<ClassSectionDto[]>([]);
  const [subjects, setSubjects] = React.useState<SubjectDto[]>([]);
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>('ALL');

  const [report, setReport] = React.useState<ClassPerformanceReportDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reportLoading, setReportLoading] = React.useState(false);

  // Load sections and subjects
  React.useEffect(() => {
    async function initOptions() {
      try {
        const [secs, subs] = await Promise.all([
          fetchSections(),
          fetchSubjects(),
        ]);
        setSections(secs);
        setSubjects(subs);
        if (secs.length > 0) {
          setSelectedSectionId(secs[0].id);
        }
      } catch (err) {
        console.error('Failed to load filter options', err);
      } finally {
        setLoading(false);
      }
    }
    initOptions();
  }, []);

  const loadReport = React.useCallback(async () => {
    if (!selectedSectionId) return;
    setReportLoading(true);
    try {
      const data = await fetchClassPerformance(selectedSectionId, {
        subjectId: selectedSubjectId !== 'ALL' ? selectedSubjectId : undefined,
      });
      setReport(data);
    } catch (err) {
      console.error('Failed to load performance report', err);
    } finally {
      setReportLoading(false);
    }
  }, [selectedSectionId, selectedSubjectId]);

  React.useEffect(() => {
    if (selectedSectionId) {
      loadReport();
    }
  }, [selectedSectionId, selectedSubjectId, loadReport]);

  const handleExportCSV = () => {
    if (!report || report.studentRankings.length === 0) return;

    const headers = ['Rank', 'Student Name', 'Overall Percentage', 'Letter Grade'];
    const rows = report.studentRankings.map((r) => [
      r.rank,
      `"${r.studentName}"`,
      `${r.overallPercentage}%`,
      r.letterGrade,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `academic_report_${report.className}_${report.sectionName}`.replace(/\s+/g, '_') + '.csv',
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthorized) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center text-sm text-destructive">
        Access restricted. Academic performance reports are available to faculty and administrators.
      </div>
    );
  }

  // Calculate cohort pass rate (>= 50%)
  const passingCount =
    report?.studentRankings.filter((r) => r.overallPercentage >= 50).length ?? 0;
  const totalRanked = report?.studentRankings.length ?? 0;
  const passRate = totalRanked > 0 ? Math.round((passingCount / totalRanked) * 100) : 0;
  const classAvgPct =
    totalRanked > 0
      ? (
          report!.studentRankings.reduce((sum, r) => sum + r.overallPercentage, 0) /
          totalRanked
        ).toFixed(1)
      : '0';

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
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Class Performance Reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Institutional academic metrics, subject distributions, and class rosters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReport}
            disabled={reportLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reportLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!report || report.studentRankings.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Selector Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
              Class Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.className || 'Class'} — Section {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
              Subject Scope
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[180px]"
            >
              <option value="ALL">All Enrolled Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {report && (
          <div className="text-xs text-muted-foreground">
            Academic Year: <strong className="text-foreground">{report.academicYearName}</strong>
          </div>
        )}
      </div>

      {reportLoading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !report ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Select a class section above to view the academic performance report.
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Class Average</span>
              <div className="mt-1 text-2xl font-bold text-primary">
                {classAvgPct}%
              </div>
              <div className="text-[11px] text-muted-foreground">Across graded assessments</div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Cohort Pass Rate</span>
              <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {passRate}%
              </div>
              <div className="text-[11px] text-muted-foreground">
                {passingCount} of {totalRanked} students &gt;= 50%
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Highest Student Avg</span>
              <div className="mt-1 text-2xl font-bold text-foreground">
                {report.studentRankings[0]?.overallPercentage ?? 0}%
              </div>
              <div className="text-[11px] text-muted-foreground">
                {report.studentRankings[0]?.studentName || 'None'}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">Total Evaluated</span>
              <div className="mt-1 text-2xl font-bold text-foreground">{totalRanked}</div>
              <div className="text-[11px] text-muted-foreground">Enrolled students with marks</div>
            </div>
          </div>

          {/* Visualizations Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Subject Performance Bar Chart */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                Subject Performance Averages
              </h3>
              <SubjectPerformanceBarChart data={report.subjectPerformance} />
            </div>

            {/* Grade Distribution Chart */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-indigo-500" />
                Letter Grade Distribution
              </h3>
              <GradeDistributionChart data={report.gradeDistribution} />
            </div>
          </div>

          {/* Student Rankings Table */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Student Performance Rankings</h3>
                <p className="text-xs text-muted-foreground">
                  Ordered by cumulative subject percentage in {report.className} — {report.sectionName}.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {report.studentRankings.length} students ranked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4 text-center">Average Score</th>
                    <th className="py-3 px-4 text-center">Letter Grade</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.studentRankings.map((st) => (
                    <tr key={st.studentId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-center font-bold">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                            st.rank === 1
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 font-extrabold'
                              : st.rank === 2
                              ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-bold'
                              : st.rank === 3
                              ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-500'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {st.rank}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <Link
                          href={`/grades/students/${st.studentId}`}
                          className="font-bold text-foreground hover:text-primary transition-colors"
                        >
                          {st.studentName}
                        </Link>
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-foreground">
                        {st.overallPercentage}%
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                          {st.letterGrade}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/grades/students/${st.studentId}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Report Card →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
