'use client';

/**
 * MODULE: Attendance Management - Institutional Reports & Analytics
 *
 * PURPOSE:
 * Provides date-range aggregated attendance rates, breakdown by date,
 * breakdown by student, presence percentages, and CSV download export.
 *
 * SECURITY:
 * Multi-tenant isolation enforced.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  AttendanceReportDto,
  ClassSectionDto,
} from '@ems/contracts';
import { fetchAttendanceReports } from '@/lib/attendance-api';
import { fetchSections } from '@/lib/classes-api';
import {
  BarChart2,
  ArrowLeft,
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Loader2,
  RefreshCw,
  BookOpen,
} from 'lucide-react';

export default function AttendanceReportsPage() {
  const { user } = useAuth();

  const [report, setReport] = React.useState<AttendanceReportDto | null>(null);
  const [sections, setSections] = React.useState<ClassSectionDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('');
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');

  const loadReport = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAttendanceReports({
        classSectionId: selectedSectionId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setReport(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSectionId, startDate, endDate]);

  React.useEffect(() => {
    async function init() {
      try {
        const sec = await fetchSections();
        setSections(sec);
      } catch (e) {
        console.error(e);
      }
    }
    init();
    loadReport();
  }, [loadReport]);

  // CSV Export Generation
  const handleExportCSV = () => {
    if (!report || !report.byStudent) return;

    const headers = ['Student ID', 'Student Name', 'Total Sessions', 'Present', 'Late', 'Absent', 'Excused', 'Presence Percentage'];
    const rows = report.byStudent.map((s) => [
      s.studentId,
      `"${s.studentName}"`,
      s.total,
      s.present,
      s.late,
      s.absent,
      s.excused,
      `${s.percentage}%`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Nav */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Attendance Dashboard
        </Link>

        {report && report.byStudent && report.byStudent.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Export to CSV
          </button>
        )}
      </div>

      {/* Header Banner */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          Attendance Analytics & Institutional Reports
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aggregated physical presence rate, daily session breakdowns, and student-level trends.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Section Filter */}
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="">All Class Sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.className} — {section.name}
              </option>
            ))}
          </select>

          {/* Date Range Start */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800 text-sm">
            <span className="text-xs text-slate-400">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          {/* Date Range End */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800 text-sm">
            <span className="text-xs text-slate-400">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          <button
            onClick={loadReport}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium uppercase text-slate-500">Overall Rate</span>
              <div className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {report.overallAttendancePercentage}%
              </div>
              <span className="text-xs text-slate-400">Present + Late</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium uppercase text-slate-500">Total Entries</span>
              <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                {report.totalRecords}
              </div>
              <span className="text-xs text-slate-400">Roll entries checked</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium uppercase text-slate-500">Full Present</span>
              <div className="mt-1 text-2xl font-extrabold text-emerald-600">
                {report.presentCount}
              </div>
              <span className="text-xs text-slate-400">On time</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium uppercase text-slate-500">Tardy / Late</span>
              <div className="mt-1 text-2xl font-extrabold text-amber-500">
                {report.lateCount}
              </div>
              <span className="text-xs text-slate-400">Attended late</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-medium uppercase text-slate-500">Absences</span>
              <div className="mt-1 text-2xl font-extrabold text-rose-600">
                {report.absentCount}
              </div>
              <span className="text-xs text-slate-400">{report.excusedCount} Excused</span>
            </div>
          </div>

          {/* Breakdown by Date */}
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                Daily Attendance Breakdown
              </h3>
            </div>
            {report.byDate.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No session records match the active criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">Total Students</th>
                      <th className="px-6 py-3 font-semibold">Present</th>
                      <th className="px-6 py-3 font-semibold">Late</th>
                      <th className="px-6 py-3 font-semibold">Absent</th>
                      <th className="px-6 py-3 font-semibold">Excused</th>
                      <th className="px-6 py-3 font-semibold text-right">Daily Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {report.byDate.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{d.date}</td>
                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{d.total}</td>
                        <td className="px-6 py-3 font-semibold text-emerald-600">{d.present}</td>
                        <td className="px-6 py-3 text-amber-500">{d.late}</td>
                        <td className="px-6 py-3 text-rose-600">{d.absent}</td>
                        <td className="px-6 py-3 text-blue-600">{d.excused}</td>
                        <td className="px-6 py-3 font-bold text-emerald-600 dark:text-emerald-400 text-right">
                          {d.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Breakdown by Student */}
          {report.byStudent && report.byStudent.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-slate-500" />
                  Student Presence Performance
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Student Name</th>
                      <th className="px-6 py-3 font-semibold">Sessions</th>
                      <th className="px-6 py-3 font-semibold">Present</th>
                      <th className="px-6 py-3 font-semibold">Late</th>
                      <th className="px-6 py-3 font-semibold">Absent</th>
                      <th className="px-6 py-3 font-semibold">Excused</th>
                      <th className="px-6 py-3 font-semibold text-right">Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {report.byStudent.map((s) => (
                      <tr key={s.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                          <Link
                            href={`/attendance/students/${s.studentId}`}
                            className="hover:underline text-emerald-600 dark:text-emerald-400"
                          >
                            {s.studentName}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{s.total}</td>
                        <td className="px-6 py-3 font-semibold text-emerald-600">{s.present}</td>
                        <td className="px-6 py-3 text-amber-500">{s.late}</td>
                        <td className="px-6 py-3 text-rose-600">{s.absent}</td>
                        <td className="px-6 py-3 text-blue-600">{s.excused}</td>
                        <td className="px-6 py-3 font-bold text-emerald-600 dark:text-emerald-400 text-right">
                          {s.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No attendance data found.
        </div>
      )}
    </div>
  );
}
