'use client';

/**
 * MODULE: Institutional Attendance Management - Dashboard & Sessions Register
 *
 * PURPOSE:
 * Displays today's attendance sessions, class registers, status metrics,
 * quick filters, and role-adapted views for Teachers, Admins, Students, and Parents.
 *
 * SECURITY:
 * RBAC and multi-tenant scoping enforced.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  UserRole,
  AttendanceSessionDto,
  AttendanceSessionStatus,
  StudentAttendanceSummaryDto,
  ParentDashboardSummaryDto,
} from '@ems/contracts';
import {
  fetchAttendanceSessions,
  fetchStudentAttendance,
} from '@/lib/attendance-api';
import { fetchParentDashboard } from '@/lib/parents-api';
import {
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  BarChart2,
  Radio,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  RefreshCw,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

export default function AttendanceDashboardPage() {
  const router = useRouter();
  const { user, effectiveRole } = useAuth();

  const isStaff =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN ||
    effectiveRole === UserRole.TEACHER;
  const isStudent = effectiveRole === UserRole.STUDENT;
  const isParent = effectiveRole === UserRole.PARENT;

  // Staff State
  const [sessions, setSessions] = React.useState<AttendanceSessionDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Student / Parent State
  const [studentSummary, setStudentSummary] = React.useState<StudentAttendanceSummaryDto | null>(null);
  const [parentData, setParentData] = React.useState<ParentDashboardSummaryDto | null>(null);
  const [selectedChildId, setSelectedChildId] = React.useState<string>('');

  const loadStaffData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAttendanceSessions({
        date: selectedDate || undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as AttendanceSessionStatus) : undefined,
      });
      setSessions(data);
    } catch (err) {
      console.error('Failed to load attendance sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter]);

  const loadStudentData = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchStudentAttendance(user.id);
      setStudentSummary(data);
    } catch (err) {
      console.error('Failed to load student attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadParentData = React.useCallback(async () => {
    setLoading(true);
    try {
      const dashboard = await fetchParentDashboard();
      setParentData(dashboard);
      if (dashboard.students && dashboard.students.length > 0) {
        const firstChild = dashboard.students[0];
        setSelectedChildId(firstChild.id);
        const childAtt = await fetchStudentAttendance(firstChild.id);
        setStudentSummary(childAtt);
      }
    } catch (err) {
      console.error('Failed to load parent attendance data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectChild = async (childId: string) => {
    setSelectedChildId(childId);
    setLoading(true);
    try {
      const childAtt = await fetchStudentAttendance(childId);
      setStudentSummary(childAtt);
    } catch (err) {
      console.error('Failed to fetch child attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isStaff) {
      loadStaffData();
    } else if (isStudent) {
      loadStudentData();
    } else if (isParent) {
      loadParentData();
    }
  }, [isStaff, isStudent, isParent, loadStaffData, loadStudentData, loadParentData]);

  // Compute metrics for staff
  const totalSessionsCount = sessions.length;
  const draftSessionsCount = sessions.filter((s) => s.status === AttendanceSessionStatus.DRAFT).length;
  const finalizedSessionsCount = sessions.filter((s) => s.status === AttendanceSessionStatus.FINALIZED).length;
  const avgAttendance =
    totalSessionsCount > 0
      ? Math.round(
          sessions.reduce((acc, s) => acc + s.attendancePercentage, 0) / totalSessionsCount,
        )
      : 100;

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.className.toLowerCase().includes(q) ||
      s.sectionName.toLowerCase().includes(q) ||
      s.createdByName.toLowerCase().includes(q)
    );
  });

  // ---------------------------------------------------------------------------
  // STUDENT & PARENT VIEW
  // ---------------------------------------------------------------------------
  if (isStudent || isParent) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              {isParent ? 'Child Attendance Records' : 'My Attendance Portal'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isParent
                ? 'Review verified attendance history, physical presence rate, and class registers.'
                : 'Live attendance history, physical presence percentages, and absence logs.'}
            </p>
          </div>
        </div>

        {/* Multi-Child Switcher for Parents */}
        {isParent && parentData && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Select Ward:
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {parentData.students?.map((child) => (
                <button
                  key={child.id}
                  onClick={() => handleSelectChild(child.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    selectedChildId === child.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  {child.firstName} {child.lastName}
                  {child.currentSection && (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                      {child.currentSection.className} — {child.currentSection.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : studentSummary ? (
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                <span className="text-xs font-medium uppercase text-slate-500">Attendance Rate</span>
                <div className="mt-2 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {studentSummary.attendancePercentage}%
                </div>
                <span className="text-xs text-slate-400 mt-1 block">Present & Late Combined</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                <span className="text-xs font-medium uppercase text-slate-500">Days Present</span>
                <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                  {studentSummary.presentSessions}
                </div>
                <span className="text-xs text-emerald-600 mt-1 block">Full Attendance</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                <span className="text-xs font-medium uppercase text-slate-500">Days Absent</span>
                <div className="mt-2 text-3xl font-extrabold text-rose-600">
                  {studentSummary.absentSessions}
                </div>
                <span className="text-xs text-slate-400 mt-1 block">Unexcused Absences</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                <span className="text-xs font-medium uppercase text-slate-500">Late / Excused</span>
                <div className="mt-2 text-3xl font-extrabold text-amber-500">
                  {studentSummary.lateSessions} / {studentSummary.excusedSessions}
                </div>
                <span className="text-xs text-slate-400 mt-1 block">Tardy or Authorized</span>
              </div>
            </div>

            {/* Attendance Logs Table */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Attendance History Register
                </h3>
              </div>
              {studentSummary.records.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No attendance records logged for this academic term yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Date</th>
                        <th className="px-6 py-3 font-semibold">Session Type</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {studentSummary.records.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                            {r.date}
                          </td>
                          <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                            {r.sessionType === 'PERIOD'
                              ? `${r.periodName || 'Period'} — ${r.subjectName || 'Subject'}`
                              : 'Full-Day Session'}
                          </td>
                          <td className="px-6 py-3">
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
                          <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
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
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No enrolled student profile located.
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STAFF (ADMIN / TEACHER) WORKSPACE
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Attendance Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Daily roll calls, NFC automated gate logging, conflict prevention, and institutional registers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/attendance/nfc-simulator"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Radio className="h-4 w-4 text-indigo-500" />
            NFC Simulator
          </Link>
          <Link
            href="/attendance/reports"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
          >
            <BarChart2 className="h-4 w-4 text-sky-500" />
            Reports & Export
          </Link>
          <Link
            href="/attendance/sessions/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Start Attendance Register
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-medium uppercase text-slate-500">Date Sessions</span>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
            {totalSessionsCount}
          </div>
          <span className="text-xs text-slate-400">Total sessions logged</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-medium uppercase text-slate-500">Draft Status</span>
          <div className="mt-1 text-2xl font-extrabold text-amber-500">
            {draftSessionsCount}
          </div>
          <span className="text-xs text-slate-400">Unfinalized registers</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-medium uppercase text-slate-500">Finalized</span>
          <div className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {finalizedSessionsCount}
          </div>
          <span className="text-xs text-slate-400">Audited & locked</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-medium uppercase text-slate-500">Average Presence</span>
          <div className="mt-1 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {avgAttendance}%
          </div>
          <span className="text-xs text-slate-400">Present + Late rate</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800 text-sm">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft Only</option>
            <option value="FINALIZED">Finalized Only</option>
          </select>

          <button
            onClick={loadStaffData}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search class or section..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-4 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Attendance Sessions List */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CheckSquare className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No Attendance Sessions Found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              There are no attendance sessions scheduled for {selectedDate}. Click the button below to start taking attendance for your class.
            </p>
            <Link
              href="/attendance/sessions/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" />
              Start Attendance Register
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base text-slate-900 dark:text-white">
                      {session.className} — {session.sectionName}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        session.status === 'FINALIZED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {session.status}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {session.sessionType}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {session.attendanceDate}
                    </span>
                    {session.periodName && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {session.periodName} ({session.subjectName})
                      </span>
                    )}
                    <span>Logged by: {session.createdByName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Presence summary */}
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {session.attendancePercentage}% Presence
                    </div>
                    <div className="text-xs text-slate-400">
                      {session.presentCount} P / {session.lateCount} L / {session.absentCount} A
                    </div>
                  </div>

                  {/* Open Register Action */}
                  <Link
                    href={`/attendance/sessions/${session.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition"
                  >
                    Open Register
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
