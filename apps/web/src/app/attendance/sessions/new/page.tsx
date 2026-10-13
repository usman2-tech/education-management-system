'use client';

/**
 * MODULE: Attendance Management - New Session Register
 *
 * PURPOSE:
 * Form interface for initializing an attendance register for an authorized
 * class section and date with duplicate conflict prevention.
 *
 * SECURITY:
 * Accessible to School Administrators, Platform Administrators, and assigned Teachers.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  UserRole,
  AttendanceSessionType,
  ClassSectionDto,
} from '@ems/contracts';
import { createAttendanceSession } from '@/lib/attendance-api';
import { fetchSections } from '@/lib/classes-api';
import {
  CheckSquare,
  ArrowLeft,
  Calendar,
  Clock,
  BookOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function NewAttendanceSessionPage() {
  const router = useRouter();
  const { user, effectiveRole } = useAuth();

  const [sections, setSections] = React.useState<ClassSectionDto[]>([]);
  const [loadingClasses, setLoadingClasses] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form State
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('');
  const [attendanceDate, setAttendanceDate] = React.useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [sessionType, setSessionType] = React.useState<AttendanceSessionType>(
    AttendanceSessionType.DAILY,
  );

  React.useEffect(() => {
    async function loadAcademicSections() {
      try {
        const data = await fetchSections();
        setSections(data);
        if (data.length > 0) {
          setSelectedSectionId(data[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load sections:', err);
        setError('Failed to retrieve class catalogue.');
      } finally {
        setLoadingClasses(false);
      }
    }
    loadAcademicSections();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId) {
      setError('Please select an authorized class section.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const session = await createAttendanceSession({
        classSectionId: selectedSectionId,
        attendanceDate,
        sessionType,
      });

      // Redirect directly to the interactive register
      router.push(`/attendance/sessions/${session.id}`);
    } catch (err: any) {
      console.error('Failed to create attendance session:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to create attendance session.';
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back Button */}
      <Link
        href="/attendance"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Attendance Dashboard
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          Start Attendance Register
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Create a daily or period attendance register. Enrolled students will be automatically populated into the draft register.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Class Section Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-slate-500" />
              Class Section Roster
            </label>
            {loadingClasses ? (
              <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                Loading classes...
              </div>
            ) : (
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Class & Section...</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.className} — {section.name} (Room: {section.roomNumber || 'TBA'})
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-slate-500">
              Only class sections within your authorized institutional campus are available.
            </p>
          </div>

          {/* Attendance Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-500" />
              Attendance Date
            </label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Session Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />
              Session Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSessionType(AttendanceSessionType.DAILY)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  sessionType === AttendanceSessionType.DAILY
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-semibold text-sm">Full-Day Roll Call</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Standard institutional daily morning attendance.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSessionType(AttendanceSessionType.PERIOD)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  sessionType === AttendanceSessionType.PERIOD
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-semibold text-sm">Period / Slot</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Subject or timetable period attendance.
                </div>
              </button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/attendance"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || loadingClasses}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initializing Register...
                </>
              ) : (
                'Create & Open Register'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
