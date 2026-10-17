'use client';

/**
 * MODULE: Attendance Management - Interactive Session Register
 *
 * PURPOSE:
 * Interactive classroom roll-call register:
 * - Real student roster with Roll # and admission info
 * - Present, Late, Excused, Absent status controls
 * - Bulk actions: "Mark All Present"
 * - Atomic register save (PUT /records)
 * - Finalize session with confirmation modal
 * - Administrative audited corrections for finalized sessions
 *
 * SECURITY:
 * Role-aware: Teachers can edit draft sessions for assigned classes.
 * Finalized registers require School Administrator or Platform Administrator.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  UserRole,
  AttendanceSessionDto,
  AttendanceStatus,
  AttendanceSessionStatus,
  BulkMarkAttendanceItem,
} from '@ems/contracts';
import {
  fetchAttendanceSessionById,
  bulkMarkAttendanceRecords,
  finalizeAttendanceSession,
} from '@/lib/attendance-api';
import {
  CheckSquare,
  ArrowLeft,
  Calendar,
  Clock,
  BookOpen,
  Users,
  Save,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Loader2,
  Check,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export default function AttendanceRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const { user, effectiveRole } = useAuth();
  const sessionId = params.id as string;

  const [session, setSession] = React.useState<AttendanceSessionDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [finalizing, setFinalizing] = React.useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Local draft records state for instant in-browser editing before saving
  const [recordDrafts, setRecordDrafts] = React.useState<
    Record<string, { status: AttendanceStatus; remarks: string }>
  >({});

  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const isFinalized = session?.status === AttendanceSessionStatus.FINALIZED;
  // Finalized sessions are locked for ordinary teachers, but administrators can apply corrections
  const isLocked = isFinalized && !isAdmin;

  const loadSession = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAttendanceSessionById(sessionId);
      setSession(data);

      // Initialize local drafts from existing records
      const drafts: Record<string, { status: AttendanceStatus; remarks: string }> = {};
      if (data.records) {
        for (const r of data.records) {
          drafts[r.studentId] = {
            status: r.status,
            remarks: r.remarks || '',
          };
        }
      }
      setRecordDrafts(drafts);
    } catch (err: any) {
      console.error('Failed to load attendance session:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load register.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (isLocked) return;
    setRecordDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    if (isLocked) return;
    setRecordDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    if (isLocked || !session?.records) return;
    const updated: Record<string, { status: AttendanceStatus; remarks: string }> = {};
    for (const r of session.records) {
      updated[r.studentId] = {
        status: AttendanceStatus.PRESENT,
        remarks: recordDrafts[r.studentId]?.remarks || '',
      };
    }
    setRecordDrafts(updated);
  };

  const handleSaveRegister = async () => {
    if (!session?.records) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const items: BulkMarkAttendanceItem[] = session.records.map((r) => ({
      studentId: r.studentId,
      status: recordDrafts[r.studentId]?.status || AttendanceStatus.PRESENT,
      remarks: recordDrafts[r.studentId]?.remarks || undefined,
    }));

    try {
      const updated = await bulkMarkAttendanceRecords(session.id, { records: items });
      setSession(updated);
      setSuccessMsg(
        isFinalized
          ? 'Administrative attendance correction successfully saved and audited.'
          : 'Attendance register saved successfully.',
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save register:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save attendance records.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmFinalize = async () => {
    if (!session) return;
    setFinalizing(true);
    setError(null);
    try {
      // Save records first then finalize
      await handleSaveRegister();
      const finalized = await finalizeAttendanceSession(session.id);
      setSession(finalized);
      setShowFinalizeModal(false);
      setSuccessMsg('Attendance register finalized and locked for institutional audit.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Failed to finalize session:', err);
      setError(err.response?.data?.message || err.message || 'Failed to finalize session.');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!session) {
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
          {error || 'Attendance register not found.'}
        </div>
      </div>
    );
  }

  const records = session.records || [];
  const currentPresent = Object.values(recordDrafts).filter((r) => r.status === AttendanceStatus.PRESENT).length;
  const currentLate = Object.values(recordDrafts).filter((r) => r.status === AttendanceStatus.LATE).length;
  const currentAbsent = Object.values(recordDrafts).filter((r) => r.status === AttendanceStatus.ABSENT).length;
  const currentExcused = Object.values(recordDrafts).filter((r) => r.status === AttendanceStatus.EXCUSED).length;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Attendance Dashboard
        </Link>

        <div className="flex items-center gap-2">
          {isFinalized ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Lock className="h-3.5 w-3.5" />
              Finalized Register
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Unlock className="h-3.5 w-3.5" />
              Draft Session
            </span>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              {session.className} — {session.sectionName} Register
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-4 w-4" />
                {session.attendanceDate}
              </span>
              <span>{session.sessionType === 'PERIOD' ? `${session.periodName} (${session.subjectName})` : 'Full-Day Session'}</span>
              <span>Enrolled: {records.length} Students</span>
              <span>Instructor: {session.createdByName}</span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-center dark:bg-emerald-950/30">
              <span className="text-xs font-semibold text-emerald-600">Present</span>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{currentPresent}</div>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-center dark:bg-amber-950/30">
              <span className="text-xs font-semibold text-amber-600">Late</span>
              <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{currentLate}</div>
            </div>
            <div className="rounded-lg bg-rose-50 px-3 py-1.5 text-center dark:bg-rose-950/30">
              <span className="text-xs font-semibold text-rose-600">Absent</span>
              <div className="text-lg font-bold text-rose-700 dark:text-rose-300">{currentAbsent}</div>
            </div>
            <div className="rounded-lg bg-blue-50 px-3 py-1.5 text-center dark:bg-blue-950/30">
              <span className="text-xs font-semibold text-blue-600">Excused</span>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{currentExcused}</div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-2">
            {!isLocked && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Mark All Present
              </button>
            )}

            {isFinalized && isAdmin && (
              <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Admin Correction Mode (Audited)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isLocked && (
              <>
                <button
                  type="button"
                  onClick={handleSaveRegister}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-emerald-950/20 disabled:opacity-50 transition"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Register
                </button>

                {!isFinalized && (
                  <button
                    type="button"
                    onClick={() => setShowFinalizeModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Finalize Attendance
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {isLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <Lock className="h-5 w-5 shrink-0" />
          <span>This register has been finalized and locked. Corrections require School Administrator authorization.</span>
        </div>
      )}

      {/* Student Roster Table */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            Class Student Roster ({records.length})
          </h3>
          <span className="text-xs text-slate-400">
            Click status button to toggle individual roll call.
          </span>
        </div>

        {records.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No active students are currently enrolled in this class section.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold w-16">Roll #</th>
                  <th className="px-6 py-3 font-semibold">Student Name</th>
                  <th className="px-6 py-3 font-semibold text-center w-72">Attendance Status</th>
                  <th className="px-6 py-3 font-semibold">Remarks & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {records.map((r, idx) => {
                  const draft = recordDrafts[r.studentId] || {
                    status: AttendanceStatus.PRESENT,
                    remarks: '',
                  };

                  return (
                    <tr
                      key={r.studentId}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-3.5 font-medium text-slate-500 dark:text-slate-400">
                        {r.rollNumber || String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-white">
                        <div>{r.studentName}</div>
                        <div className="text-xs text-slate-400">{r.studentEmail}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Present Button */}
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleStatusChange(r.studentId, AttendanceStatus.PRESENT)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                              draft.status === AttendanceStatus.PRESENT
                                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                            }`}
                          >
                            Present
                          </button>

                          {/* Late Button */}
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleStatusChange(r.studentId, AttendanceStatus.LATE)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                              draft.status === AttendanceStatus.LATE
                                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                            }`}
                          >
                            Late
                          </button>

                          {/* Excused Button */}
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleStatusChange(r.studentId, AttendanceStatus.EXCUSED)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                              draft.status === AttendanceStatus.EXCUSED
                                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                            }`}
                          >
                            Excused
                          </button>

                          {/* Absent Button */}
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleStatusChange(r.studentId, AttendanceStatus.ABSENT)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                              draft.status === AttendanceStatus.ABSENT
                                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <input
                          type="text"
                          placeholder="Optional remarks (e.g. sick, traffic)"
                          value={draft.remarks}
                          disabled={isLocked}
                          onChange={(e) => handleRemarksChange(r.studentId, e.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-transparent px-2.5 py-1 text-xs text-slate-800 dark:border-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Finalize Confirmation Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2.5 dark:bg-amber-950/60">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Finalize Attendance Register?
                </h3>
                <p className="text-xs text-slate-500">
                  This action locks the attendance roll for audit integrity.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 space-y-1">
              <div>• Total Students: <strong>{records.length}</strong></div>
              <div>• Present: <strong>{currentPresent}</strong> | Late: <strong>{currentLate}</strong> | Absent: <strong>{currentAbsent}</strong></div>
              <div>• After finalization, only administrators can perform audited corrections.</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalize}
                disabled={finalizing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {finalizing && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm & Finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
