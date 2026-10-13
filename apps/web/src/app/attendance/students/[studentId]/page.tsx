'use client';

/**
 * MODULE: Attendance Management - Student Attendance Profile
 *
 * PURPOSE:
 * Displays individual student attendance history, presence percentage,
 * absence counts, and session register logs.
 *
 * SECURITY:
 * Authorized by role: Student can view own; Parent can view verified linked child;
 * School Admin and assigned Teachers can view enrolled students.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StudentAttendanceSummaryDto } from '@ems/contracts';
import { fetchStudentAttendance } from '@/lib/attendance-api';
import {
  CheckSquare,
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  GraduationCap,
  BookOpen,
} from 'lucide-react';

export default function StudentAttendanceProfilePage() {
  const params = useParams();
  const studentId = params.studentId as string;

  const [summary, setSummary] = React.useState<StudentAttendanceSummaryDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchStudentAttendance(studentId);
        setSummary(data);
      } catch (err: any) {
        console.error('Failed to load student attendance:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load student attendance.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentId]);

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
          {error || 'Student attendance record not found.'}
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

      {/* Header Profile Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-lg">
              {summary.studentName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {summary.studentName}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>{summary.studentEmail}</span>
                <span>•</span>
                <span>Class: {summary.className} — {summary.sectionName}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs uppercase font-semibold text-slate-400">Attendance Rate</span>
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary.attendancePercentage}%
            </div>
            <span className="text-xs text-slate-400">Physical Presence Rate</span>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="rounded-lg bg-emerald-50/60 p-3 dark:bg-emerald-950/20">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Days Present</span>
            <div className="text-xl font-bold text-emerald-900 dark:text-emerald-200">{summary.presentSessions}</div>
          </div>
          <div className="rounded-lg bg-amber-50/60 p-3 dark:bg-amber-950/20">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Tardy / Late</span>
            <div className="text-xl font-bold text-amber-900 dark:text-amber-200">{summary.lateSessions}</div>
          </div>
          <div className="rounded-lg bg-rose-50/60 p-3 dark:bg-rose-950/20">
            <span className="text-xs font-medium text-rose-700 dark:text-rose-400">Unexcused Absences</span>
            <div className="text-xl font-bold text-rose-900 dark:text-rose-200">{summary.absentSessions}</div>
          </div>
          <div className="rounded-lg bg-blue-50/60 p-3 dark:bg-blue-950/20">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Excused Absences</span>
            <div className="text-xl font-bold text-blue-900 dark:text-blue-200">{summary.excusedSessions}</div>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            Attendance History Register ({summary.records.length})
          </h3>
        </div>

        {summary.records.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No attendance entries logged for this student yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Session Type</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Remarks & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {summary.records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-white">
                      {r.date}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">
                      {r.sessionType === 'PERIOD'
                        ? `${r.periodName || 'Period'} — ${r.subjectName || 'Subject'}`
                        : 'Full-Day Session'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          r.status === 'PRESENT'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : r.status === 'LATE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : r.status === 'EXCUSED'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">
                      {r.remarks || '—'}
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
