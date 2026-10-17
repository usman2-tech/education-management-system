'use client';

/**
 * MODULE: Homework Management - Detail, Submission & Grading Page
 */

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { homeworkApi } from '@/lib/homework-api';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Send,
  User,
  AlertCircle,
  Save,
} from 'lucide-react';

export default function HomeworkDetailPage() {
  const params = useParams();
  const homeworkId = params.id as string;
  const router = useRouter();
  const { user, effectiveRole } = useAuth();

  const isTeacher = effectiveRole === UserRole.TEACHER;
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;
  const isStudent = effectiveRole === UserRole.STUDENT;

  const [homework, setHomework] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Student submission form state
  const [submissionContent, setSubmissionContent] = React.useState('');
  const [submissionAttachments, setSubmissionAttachments] = React.useState('');
  const [submittingWork, setSubmittingWork] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  // Teacher grading state
  const [gradingId, setGradingId] = React.useState<string | null>(null);
  const [gradeInput, setGradeInput] = React.useState<number>(0);
  const [feedbackInput, setFeedbackInput] = React.useState('');
  const [savingGrade, setSavingGrade] = React.useState(false);

  const loadHomework = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await homeworkApi.getHomeworkById(homeworkId);
      setHomework(data);
      if (isStudent && user?.id) {
        const mySub = data.submissions?.find((s: any) => s.studentId === user.id);
        if (mySub) {
          setSubmissionContent(mySub.content || '');
          setSubmissionAttachments(mySub.attachments || '');
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  }, [homeworkId, isStudent, user?.id]);

  React.useEffect(() => {
    loadHomework();
  }, [loadHomework]);

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingWork(true);
    setError(null);
    try {
      await homeworkApi.submitHomework(homeworkId, {
        content: submissionContent,
        attachments: submissionAttachments || undefined,
      });
      setSubmitSuccess(true);
      await loadHomework();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to submit homework');
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleSaveGrade = async (submissionId: string) => {
    setSavingGrade(true);
    try {
      await homeworkApi.gradeSubmission(submissionId, {
        grade: Number(gradeInput),
        feedback: feedbackInput,
      });
      setGradingId(null);
      await loadHomework();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save grade');
    } finally {
      setSavingGrade(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !homework) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
        <AlertCircle className="mx-auto h-8 w-8 mb-2" />
        <h3 className="text-lg font-semibold">Error Loading Assignment</h3>
        <p className="mt-1 text-sm">{error || 'Assignment not found.'}</p>
        <Link
          href="/homework"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Homework
        </Link>
      </div>
    );
  }

  const dueDate = new Date(homework.dueDate);
  const mySubmission = homework.submissions?.find((s: any) => s.studentId === user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/homework"
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {homework.subjectName} ({homework.subjectCode})
              </span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                Class: {homework.className} - {homework.sectionName}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  homework.status === 'PUBLISHED'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}
              >
                {homework.status}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {homework.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-3">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Assigned by {homework.teacherName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Due {dueDate.toLocaleString()}
              </span>
              <span>•</span>
              <span className="font-semibold text-foreground">
                Max Points: {homework.maxPoints}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Assignment Instructions Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Instructions & Resources
        </h2>
        <div className="mt-3 whitespace-pre-wrap rounded-lg bg-background p-4 text-sm text-foreground/90 border border-border/50">
          {homework.instructions}
        </div>

        {homework.attachments && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">Attachment:</span>
            <a
              href={homework.attachments}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              {homework.attachments} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* STUDENT SUBMISSION PANEL */}
      {isStudent && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Your Submission
            </h2>
            {mySubmission && (
              <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                Status: {mySubmission.status} {mySubmission.isLate && '(Late)'}
              </span>
            )}
          </div>

          {submitSuccess && (
            <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
              Work submitted successfully!
            </div>
          )}

          {mySubmission?.grade !== null && mySubmission?.grade !== undefined && (
            <div className="rounded-lg border border-border bg-accent/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Teacher Evaluation</span>
                <span className="text-lg font-bold text-primary">
                  {mySubmission.grade} / {homework.maxPoints} pts
                </span>
              </div>
              {mySubmission.feedback && (
                <p className="mt-2 text-sm text-muted-foreground border-t border-border pt-2">
                  <span className="font-semibold text-foreground">Feedback: </span>
                  {mySubmission.feedback}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmitHomework} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your Answer / Notes
              </label>
              <textarea
                rows={4}
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                placeholder="Type your response, calculations, or submission summary here..."
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Attached Document or Link URL
              </label>
              <input
                type="text"
                value={submissionAttachments}
                onChange={(e) => setSubmissionAttachments(e.target.value)}
                placeholder="https://drive.google.com/... or uploaded document link"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingWork}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {submittingWork ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {mySubmission ? 'Update Submission' : 'Submit Assignment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TEACHER / ADMIN ROSTER & SUBMISSION REVIEW */}
      {(isTeacher || isAdmin) && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Student Submissions ({homework.submissions?.length || 0})
              </h2>
              <p className="text-xs text-muted-foreground">
                Review submitted work, record grades, and provide constructive feedback.
              </p>
            </div>
          </div>

          {homework.submissions?.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No students have submitted work for this assignment yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Work Preview</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {homework.submissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div>{sub.studentName}</div>
                        <div className="text-xs text-muted-foreground">{sub.studentEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(sub.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                            sub.status === 'GRADED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : sub.isLate
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {sub.status} {sub.isLate && '(Late)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="truncate text-xs text-foreground/80">{sub.content}</div>
                        {sub.attachments && (
                          <a
                            href={sub.attachments}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline truncate block"
                          >
                            Attachment link
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {sub.grade !== null && sub.grade !== undefined ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {sub.grade} / {homework.maxPoints}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Unscored</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setGradingId(sub.id);
                            setGradeInput(sub.grade ?? homework.maxPoints);
                            setFeedbackInput(sub.feedback ?? '');
                          }}
                          className="rounded border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-accent"
                        >
                          {sub.grade !== null && sub.grade !== undefined ? 'Edit Grade' : 'Grade'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Grading Modal */}
      {gradingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground">Score & Feedback</h3>
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Score (out of {homework.maxPoints})
              </label>
              <input
                type="number"
                min={0}
                max={homework.maxPoints}
                value={gradeInput}
                onChange={(e) => setGradeInput(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Feedback for Student
              </label>
              <textarea
                rows={3}
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="Well done, but check question 3..."
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGradingId(null)}
                className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingGrade}
                onClick={() => handleSaveGrade(gradingId)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {savingGrade ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
