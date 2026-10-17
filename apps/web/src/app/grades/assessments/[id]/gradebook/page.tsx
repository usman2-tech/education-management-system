'use client';

/**
 * MODULE: Grades & Academic Performance - Teacher Gradebook
 *
 * PURPOSE:
 * Interactive classroom gradebook table for bulk marks entry, live percentage
 * and grading scale evaluation, student feedback, and draft saving / publishing.
 *
 * SECURITY:
 * Authorized teachers and school administrators only.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  AssessmentGradebookDto,
  AssessmentStatus,
  BulkSaveGradebookRequest,
  UserRole,
} from '@ems/contracts';
import {
  fetchAssessmentGradebook,
  saveAssessmentGradebook,
  publishAssessment,
} from '@/lib/grades-api';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Save,
  Send,
  Users,
} from 'lucide-react';

interface LocalStudentRow {
  studentId: string;
  studentName: string;
  admissionNumber?: string | null;
  marksInput: string; // string for controlled input to allow empty for missing vs '0'
  feedback: string;
}

export default function AssessmentGradebookPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user, effectiveRole } = useAuth();

  const isStaff =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN ||
    effectiveRole === UserRole.TEACHER;

  const [gradebook, setGradebook] = React.useState<AssessmentGradebookDto | null>(null);
  const [rows, setRows] = React.useState<LocalStudentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchAssessmentGradebook(id);
      setGradebook(data);

      setRows(
        data.students.map((s) => ({
          studentId: s.studentId,
          studentName: s.studentName,
          admissionNumber: s.admissionNumber,
          marksInput: s.marksObtained !== null && s.marksObtained !== undefined ? String(s.marksObtained) : '',
          feedback: s.feedback || '',
        })),
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load gradebook.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkChange = (studentId: string, val: string) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, marksInput: val } : r)),
    );
  };

  const handleFeedbackChange = (studentId: string, val: string) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, feedback: val } : r)),
    );
  };

  const handleSave = async () => {
    if (!gradebook) return;
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const payload: BulkSaveGradebookRequest = {
        grades: rows.map((r) => {
          const trimmed = r.marksInput.trim();
          const parsed = trimmed === '' ? null : Number(trimmed);

          const maxAllowed = gradebook.assessment?.maximumMarks || 100;
          if (parsed !== null && (isNaN(parsed) || parsed < 0 || parsed > maxAllowed)) {
            throw new Error(`Marks for ${r.studentName} must be between 0 and ${maxAllowed}.`);
          }

          return {
            studentId: r.studentId,
            marksObtained: parsed,
            feedback: r.feedback.trim() || undefined,
          };
        }),
      };

      const updated = await saveAssessmentGradebook(id, payload);
      setGradebook(updated);
      setSuccessMsg('Gradebook successfully saved to database!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save gradebook.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!gradebook) return;
    if (!confirm('Are you sure you want to publish these grades? Enrolled students and verified guardians will immediately be able to view their scores.')) {
      return;
    }

    setPublishing(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // Auto-save first
      await handleSave();
      await publishAssessment(id);
      await loadData();
      setSuccessMsg('Assessment published successfully! Grades are live.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to publish assessment.');
    } finally {
      setPublishing(false);
    }
  };

  // Live Statistics Calculations
  const maxMarks = gradebook?.assessment?.maximumMarks || 100;
  const validScores = rows
    .map((r) => (r.marksInput.trim() === '' ? null : Number(r.marksInput)))
    .filter((n): n is number => n !== null && !isNaN(n));

  const gradedCount = validScores.length;
  const totalCount = rows.length;
  const missingCount = totalCount - gradedCount;

  const avgScore = gradedCount > 0 ? validScores.reduce((a, b) => a + b, 0) / gradedCount : 0;
  const avgPct = maxMarks > 0 ? Math.round((avgScore / maxMarks) * 1000) / 10 : 0;
  const highestScore = gradedCount > 0 ? Math.max(...validScores) : 0;
  const lowestScore = gradedCount > 0 ? Math.min(...validScores) : 0;

  if (!isStaff) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center text-sm text-destructive">
        Access restricted. Only assigned faculty and school administrators can access gradebooks.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/grades/assessments/${id}`}
            className="rounded-lg border border-border p-2 hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Award className="h-6 w-6 text-primary" />
                {gradebook?.assessment?.title || 'Class Gradebook'}
              </h1>
              {gradebook?.assessment && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    gradebook.assessment.status === AssessmentStatus.PUBLISHED
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}
                >
                  {gradebook.assessment.status}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Subject: {gradebook?.assessment?.subject?.name || gradebook?.assessment?.subjectName} • Class: {gradebook?.assessment?.classSection?.name || gradebook?.assessment?.sectionName} • Maximum Marks: {gradebook?.assessment?.maximumMarks}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading || saving}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-4 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-primary" />}
            Save Draft
          </button>

          {gradebook?.assessment?.status === AssessmentStatus.DRAFT && (
            <button
              onClick={handlePublish}
              disabled={publishing || saving || loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Publish Results
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-xs font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {gradebook?.assessment?.status === AssessmentStatus.PUBLISHED && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>Audited Workflow:</strong> This assessment is already published. Any modifications to marks or feedback will generate an immutable audit trail entry.
          </span>
        </div>
      )}

      {/* Live Statistics Bar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground">Class Average</span>
          <div className="text-xl font-bold text-foreground">
            {gradedCount > 0 ? `${avgPct}%` : 'N/A'}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {gradedCount > 0 ? `${avgScore.toFixed(1)} / ${maxMarks} pts` : 'No marks yet'}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground">Highest Score</span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {gradedCount > 0 ? `${highestScore} / ${maxMarks}` : 'N/A'}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {gradedCount > 0 ? `${((highestScore / maxMarks) * 100).toFixed(1)}%` : 'No marks'}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground">Lowest Score</span>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
            {gradedCount > 0 ? `${lowestScore} / ${maxMarks}` : 'N/A'}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {gradedCount > 0 ? `${((lowestScore / maxMarks) * 100).toFixed(1)}%` : 'No marks'}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground">Graded Roster</span>
          <div className="text-xl font-bold text-foreground">
            {gradedCount} / {totalCount}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {totalCount > 0 ? `${Math.round((gradedCount / totalCount) * 100)}% complete` : 'Empty class'}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <span className="text-[11px] font-medium text-muted-foreground">Missing Grades</span>
          <div className={`text-xl font-bold ${missingCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {missingCount}
          </div>
          <span className="text-[10px] text-muted-foreground">Excluded from averages</span>
        </div>
      </div>

      {/* Gradebook Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No students currently enrolled in this class section.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Admission #</th>
                  <th className="py-3 px-4 w-32">Marks ({maxMarks})</th>
                  <th className="py-3 px-4 w-28 text-center">Percentage</th>
                  <th className="py-3 px-4 w-24 text-center">Grade</th>
                  <th className="py-3 px-4">Teacher Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, idx) => {
                  const val = row.marksInput.trim();
                  const isNull = val === '';
                  const num = Number(val);
                  const isInvalid = !isNull && (isNaN(num) || num < 0 || num > maxMarks);
                  const pct = !isNull && !isInvalid ? Math.round((num / maxMarks) * 1000) / 10 : null;

                  return (
                    <tr
                      key={row.studentId}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-medium text-muted-foreground">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <Link
                          href={`/grades/students/${row.studentId}`}
                          className="font-bold text-foreground hover:text-primary transition-colors"
                        >
                          {row.studentName}
                        </Link>
                      </td>

                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {row.admissionNumber || '—'}
                      </td>

                      <td className="py-3 px-4">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={maxMarks}
                          placeholder="Missing"
                          value={row.marksInput}
                          onChange={(e) => handleMarkChange(row.studentId, e.target.value)}
                          className={`w-full rounded-md border px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 ${
                            isInvalid
                              ? 'border-destructive focus:ring-destructive bg-destructive/10'
                              : 'border-input bg-background focus:ring-primary'
                          }`}
                        />
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-foreground">
                        {isNull ? (
                          <span className="text-muted-foreground italic">Missing</span>
                        ) : isInvalid ? (
                          <span className="text-destructive font-bold">Invalid</span>
                        ) : (
                          `${pct}%`
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isNull ? (
                          <span className="text-muted-foreground">—</span>
                        ) : isInvalid ? (
                          <span className="text-destructive font-bold">!</span>
                        ) : (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-bold text-foreground">
                            {pct! >= 90
                              ? 'A+'
                              : pct! >= 80
                              ? 'A'
                              : pct! >= 70
                              ? 'B+'
                              : pct! >= 60
                              ? 'B'
                              : pct! >= 50
                              ? 'C'
                              : pct! >= 40
                              ? 'D'
                              : 'F'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Optional notes or feedback..."
                          value={row.feedback}
                          onChange={(e) => handleFeedbackChange(row.studentId, e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-border p-4 bg-muted/20 gap-3">
            <span className="text-xs text-muted-foreground">
              Tip: Leave mark empty for missing / absent students. Enter <strong>0</strong> for zero score.
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Draft
              </button>

              {gradebook?.assessment?.status === AssessmentStatus.DRAFT && (
                <button
                  onClick={handlePublish}
                  disabled={publishing || saving || loading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {publishing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Publish Results
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
