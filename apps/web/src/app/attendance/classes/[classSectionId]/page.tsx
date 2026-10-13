'use client';

/**
 * MODULE: Attendance Management - Class Attendance History
 *
 * PURPOSE:
 * Displays historical class attendance trends, session logs, and section analytics.
 *
 * SECURITY:
 * School-scoped: Accessible to administrators and assigned educators.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ClassAttendanceSummaryDto } from '@ems/contracts';
import { fetchClassAttendance } from '@/lib/attendance-api';
import {
  CheckSquare,
  ArrowLeft,
  Calendar,
  Clock,
  BookOpen,
  Users,
  ChevronRight,
  Loader2,
  AlertCircle,
  BarChart2,
} from 'lucide-react';

export default function ClassAttendancePage() {
  const params = useParams();
  const classSectionId = params.classSectionId as string;

  const [summary, setSummary] = React.useState<ClassAttendanceSummaryDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchClassAttendance(classSectionId);
        setSummary(data);
      } catch (err: any) {
        console.error('Failed to load class attendance:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load class attendance.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [classSectionId]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-4">
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Attendance
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          {error || 'Class attendance records not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/attendance"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Attendance Dashboard
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              {summary.className} — {summary.sectionName} Attendance History
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Historical class attendance records, daily rosters, and term percentages.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs uppercase font-semibold text-slate-400">Class Average</span>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {summary.averageAttendancePercentage}%
              </div>
            </div>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <span className="text-xs font-medium text-slate-500">Enrolled Students</span>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{summary.totalStudents}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <span className="text-xs font-medium text-slate-500">Total Sessions Recorded</span>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{summary.totalSessions}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <span className="text-xs font-medium text-slate-500">Attendance Status</span>
            <div className="text-lg font-bold text-emerald-600">Active Register</div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Class Attendance Sessions ({summary.sessions.length})
          </h3>
        </div>

        {summary.sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No attendance sessions recorded for this class section yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {summary.sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {s.attendanceDate}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        s.status === 'FINALIZED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {s.status}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {s.sessionType}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Logged by {s.createdByName} {s.finalizedByName && `• Finalized by ${s.finalizedByName}`}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {s.attendancePercentage}% Presence
                    </div>
                    <div className="text-xs text-slate-400">
                      {s.presentCount} P / {s.lateCount} L / {s.absentCount} A
                    </div>
                  </div>

                  <Link
                    href={`/attendance/sessions/${s.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition"
                  >
                    View Register
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
