'use client';

/**
 * MODULE: Exam Details, Review & Grading Interface
 */

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { examsApi } from '@/lib/exams-api';
import { UserRole } from '@ems/contracts';
import {
  Award,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  Check,
  X,
  Loader2,
  Share2,
  BookOpen,
} from 'lucide-react';

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user, effectiveRole } = useAuth();

  const isTeacher = effectiveRole === UserRole.TEACHER;
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;
  const isStudent = effectiveRole === UserRole.STUDENT;
  const isParent = effectiveRole === UserRole.PARENT;
  const canManage = isTeacher || isAdmin;

  const [exam, setExam] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [publishing, setPublishing] = React.useState(false);

  // Grading modal state
  const [selectedAttempt, setSelectedAttempt] = React.useState<any | null>(null);
  const [gradingScores, setGradingScores] = React.useState<Record<string, number>>({});
  const [gradingFeedback, setGradingFeedback] = React.useState('');
  const [submittingGrade, setSubmittingGrade] = React.useState(false);

  const loadExam = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await examsApi.getExamById(id);
      setExam(data);
    } catch (err: any) {
      console.error('Failed to load exam details:', err);
      setError(err?.message || 'Failed to load exam details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadExam();
  }, [loadExam]);

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish results? This will finalize scores and sync grades to academic records.')) {
      return;
    }
    setPublishing(true);
    try {
      await examsApi.publishResults(id);
      await loadExam();
    } catch (err: any) {
      alert(err?.message || 'Failed to publish results');
    } finally {
      setPublishing(false);
    }
  };

  const handleOpenGradeModal = (att: any) => {
    setSelectedAttempt(att);
    setGradingFeedback(att.feedback || '');
    const initialScores: Record<string, number> = {};
    if (att.answers) {
      att.answers.forEach((ans: any) => {
        initialScores[ans.questionId] = ans.awardedMarks ?? 0;
      });
    }
    setGradingScores(initialScores);
  };

  const handleSaveGrades = async () => {
    if (!selectedAttempt) return;
    setSubmittingGrade(true);
    try {
      const gradesPayload = Object.entries(gradingScores).map(([qId, marks]) => ({
        questionId: qId,
        awardedMarks: Number(marks),
      }));

      await examsApi.gradeAttempt(selectedAttempt.id, {
        feedback: gradingFeedback,
        grades: gradesPayload,
      });

      setSelectedAttempt(null);
      await loadExam();
    } catch (err: any) {
      alert(err?.message || 'Failed to save student attempt grade.');
    } finally {
      setSubmittingGrade(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h2 className="text-xl font-bold text-foreground">Examination Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">{error || 'Unable to retrieve examination record.'}</p>
        <Link href="/exams" className="text-primary hover:underline text-sm">
          Return to Examinations
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/exams"
            className="p-2 border border-border rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                {exam.status.replace('_', ' ')}
              </span>
              <span className="text-xs text-muted-foreground">
                {exam.subjectName} • {exam.className} {exam.sectionName}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
              {exam.title}
            </h1>
          </div>
        </div>

        {canManage && exam.status !== 'RESULTS_PUBLISHED' && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Publish Results to Gradebook
          </button>
        )}
      </div>

      {/* Info Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-card border border-border rounded-xl p-5">
        <div>
          <span className="text-xs text-muted-foreground block">Exam Date</span>
          <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {new Date(exam.examDate).toLocaleDateString()}
          </span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">Duration</span>
          <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {exam.durationMinutes} Minutes
          </span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">Total Marks</span>
          <span className="text-sm font-semibold text-foreground mt-0.5 block">
            {exam.totalMarks} Marks
          </span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">Passing Marks</span>
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {exam.passingMarks} Marks
          </span>
        </div>
      </div>

      {exam.description && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Instructions</h3>
          <p className="text-sm text-foreground whitespace-pre-wrap">{exam.description}</p>
        </div>
      )}

      {/* Student View: Their Attempt Result */}
      {isStudent && exam.myAttempt && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">My Assessment Result</h2>
              <p className="text-xs text-muted-foreground">
                Submitted at: {new Date(exam.myAttempt.submittedAt || exam.myAttempt.startedAt).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-primary">
                {exam.myAttempt.obtainedMarks ?? 0} / {exam.totalMarks}
              </span>
              <span className="block text-xs font-medium text-muted-foreground">
                Score: {exam.myAttempt.percentage ?? 0}%
              </span>
            </div>
          </div>

          {exam.myAttempt.feedback && (
            <div className="p-3 bg-muted rounded-lg text-sm text-foreground">
              <span className="font-semibold block text-xs text-muted-foreground mb-1">Teacher Feedback:</span>
              {exam.myAttempt.feedback}
            </div>
          )}

          {/* Answer breakdown */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-foreground">Submitted Answers</h3>
            {exam.myAttempt.answers?.map((ans: any, idx: number) => (
              <div key={idx} className="p-3.5 bg-muted/40 rounded-lg border border-border space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Question {idx + 1}</span>
                  <span className="font-medium text-primary">
                    {ans.awardedMarks ?? 0} Marks
                  </span>
                </div>
                <div className="text-foreground">
                  <span className="text-muted-foreground font-semibold">Your Answer: </span>
                  {ans.answerText || <em>(No answer given)</em>}
                </div>
                {ans.teacherFeedback && (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    Feedback: {ans.teacherFeedback}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teacher / Admin View: Submissions and Grading Table */}
      {canManage && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Student Submissions ({exam.attempts?.length || 0})
            </h2>
          </div>

          {(!exam.attempts || exam.attempts.length === 0) ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No students have submitted this examination yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Submitted At</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {exam.attempts.map((att: any) => (
                    <tr key={att.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-foreground">
                        {att.studentName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-primary/10 text-primary">
                          {att.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        {att.submittedAt ? new Date(att.submittedAt).toLocaleTimeString() : 'In Progress'}
                      </td>
                      <td className="py-3 px-3 font-semibold text-foreground">
                        {att.obtainedMarks !== null ? `${att.obtainedMarks} / ${exam.totalMarks}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenGradeModal(att)}
                          className="px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium"
                        >
                          Review & Grade
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

      {/* Question Bank Preview */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Examination Questions ({exam.questions?.length || 0})
        </h2>

        <div className="space-y-3">
          {exam.questions?.map((q: any, idx: number) => (
            <div key={q.id} className="p-4 rounded-xl border border-border bg-background space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                  Q{idx + 1} • {q.questionType.replace('_', ' ')}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {q.marks} Marks
                </span>
              </div>
              <p className="font-medium text-foreground">{q.questionText}</p>

              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  {q.options.map((opt: string, optIdx: number) => (
                    <div
                      key={optIdx}
                      className={`p-2 rounded border ${
                        canManage && opt === q.correctAnswer
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'border-border bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      {opt} {canManage && opt === q.correctAnswer ? '✓ (Key)' : ''}
                    </div>
                  ))}
                </div>
              )}

              {canManage && q.correctAnswer && !q.options && (
                <div className="text-xs text-muted-foreground mt-1">
                  <strong>Expected Answer Key:</strong> {q.correctAnswer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Review & Grade Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Grading: {selectedAttempt.studentName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Review student answers and adjust awarded marks.
                </p>
              </div>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {exam.questions?.map((q: any) => {
                const studentAns = selectedAttempt.answers?.find(
                  (a: any) => a.questionId === q.id,
                );

                return (
                  <div key={q.id} className="p-3.5 bg-muted/40 rounded-lg border border-border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{q.questionText}</span>
                      <span className="text-muted-foreground">Max: {q.marks}</span>
                    </div>

                    <div className="p-2 bg-background rounded border border-border">
                      <span className="text-muted-foreground font-semibold block text-[11px]">
                        Student's Response:
                      </span>
                      <span className="text-foreground">
                        {studentAns?.answerText || <em>(No answer submitted)</em>}
                      </span>
                    </div>

                    {q.correctAnswer && (
                      <div className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                        Model Answer: {q.correctAnswer}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <label className="font-semibold text-foreground">Awarded Marks:</label>
                      <input
                        type="number"
                        min={0}
                        max={q.marks}
                        step={0.5}
                        value={gradingScores[q.id] ?? 0}
                        onChange={(e) =>
                          setGradingScores((prev) => ({
                            ...prev,
                            [q.id]: Number(e.target.value),
                          }))
                        }
                        className="w-20 px-2 py-1 bg-background border border-input rounded text-sm text-center font-bold"
                      />
                    </div>
                  </div>
                );
              })}

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Teacher Feedback
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide personalized commentary..."
                  value={gradingFeedback}
                  onChange={(e) => setGradingFeedback(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedAttempt(null)}
                className="px-4 py-2 text-xs font-medium border border-input rounded-lg hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingGrade}
                onClick={handleSaveGrades}
                className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-2"
              >
                {submittingGrade && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm & Save Grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
