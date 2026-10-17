'use client';

/**
 * MODULE: Timed Student Examination Interface
 */

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { examsApi } from '@/lib/exams-api';
import {
  Award,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Send,
} from 'lucide-react';

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [exam, setExam] = React.useState<any>(null);
  const [attempt, setAttempt] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Active question index
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(0);

  React.useEffect(() => {
    async function initExam() {
      if (!id) return;
      try {
        const [examData, attemptData] = await Promise.all([
          examsApi.getExamById(id),
          examsApi.startExam(id),
        ]);

        setExam(examData);
        setAttempt(attemptData);

        // Pre-fill any saved answers if already started
        if (attemptData.answers) {
          const initialMap: Record<string, string> = {};
          attemptData.answers.forEach((a: any) => {
            initialMap[a.questionId] = a.answerText;
          });
          setAnswers(initialMap);
        }

        // Calculate remaining seconds based on duration
        const startTime = new Date(attemptData.startedAt).getTime();
        const durationMs = examData.durationMinutes * 60 * 1000;
        const elapsedMs = Date.now() - startTime;
        const remSec = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));
        setSecondsRemaining(remSec);
      } catch (err: any) {
        console.error('Failed to initialize exam attempt:', err);
        setError(err?.message || 'Unable to start examination.');
      } finally {
        setLoading(false);
      }
    }

    initExam();
  }, [id]);

  // Live timer interval
  React.useEffect(() => {
    if (secondsRemaining <= 0 || !exam) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit on timeout
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, exam]);

  const handleSubmitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, txt]) => ({
        questionId: qId,
        answerText: txt,
      }));

      await examsApi.submitExam(id, {
        answers: formattedAnswers,
      });

      router.push(`/exams/${id}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit exam.');
      setSubmitting(false);
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
        <h2 className="text-xl font-bold text-foreground">Examination Error</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">{error || 'Could not load examination.'}</p>
        <Link href="/exams" className="text-primary hover:underline text-sm">
          Return to Examinations
        </Link>
      </div>
    );
  }

  const questions = exam.questions || [];
  const currentQuestion = questions[activeIndex];
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isTimeCritical = secondsRemaining < 300; // < 5 mins

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner with live timer */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 z-20 shadow-sm">
        <div>
          <span className="text-xs text-muted-foreground">{exam.subjectName} Assessment</span>
          <h1 className="text-lg font-bold text-foreground line-clamp-1">{exam.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono font-bold text-sm ${
              isTimeCritical
                ? 'bg-destructive/15 border-destructive text-destructive animate-pulse'
                : 'bg-muted border-border text-foreground'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Are you ready to submit your exam?')) {
                handleSubmitExam();
              }
            }}
            disabled={submitting}
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Submit Exam
          </button>
        </div>
      </div>

      {/* Question tracker pill bar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-2">
        {questions.map((q: any, idx: number) => {
          const isAnswered = !!answers[q.id];
          const isCurrent = idx === activeIndex;

          return (
            <button
              key={q.id}
              onClick={() => setActiveIndex(idx)}
              className={`h-8 w-8 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center ${
                isCurrent
                  ? 'bg-primary text-white shadow-sm ring-2 ring-primary/40'
                  : isAnswered
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-muted hover:bg-muted/80 text-foreground'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Main Question Card */}
      {currentQuestion && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-bold text-primary px-2.5 py-1 bg-primary/10 rounded-full">
              Question {activeIndex + 1} of {questions.length} • {currentQuestion.questionType.replace('_', ' ')}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Marks: {currentQuestion.marks}
            </span>
          </div>

          <p className="text-base font-medium text-foreground leading-relaxed whitespace-pre-wrap">
            {currentQuestion.questionText}
          </p>

          {/* Multiple choice options */}
          {currentQuestion.questionType === 'MULTIPLE_CHOICE' && currentQuestion.options && (
            <div className="space-y-3 pt-2">
              {currentQuestion.options.map((opt: string, optIdx: number) => {
                const isSelected = answers[currentQuestion.id] === opt;
                return (
                  <label
                    key={optIdx}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-foreground font-semibold shadow-xs'
                        : 'border-border bg-background hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      checked={isSelected}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt }))
                      }
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* True / False options */}
          {currentQuestion.questionType === 'TRUE_FALSE' && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              {['True', 'False'].map((tfVal) => {
                const isSelected = answers[currentQuestion.id] === tfVal;
                return (
                  <label
                    key={tfVal}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer text-sm font-semibold transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`tf-${currentQuestion.id}`}
                      checked={isSelected}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: tfVal }))
                      }
                      className="h-4 w-4 text-primary"
                    />
                    {tfVal}
                  </label>
                );
              })}
            </div>
          )}

          {/* Short answer / Written essay */}
          {(currentQuestion.questionType === 'SHORT_ANSWER' || currentQuestion.questionType === 'ESSAY') && (
            <div className="pt-2">
              <textarea
                rows={5}
                placeholder="Type your response here..."
                value={answers[currentQuestion.id] || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {/* Question navigation footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
              disabled={activeIndex === 0}
              className="px-3.5 py-2 text-xs font-medium border border-input rounded-lg hover:bg-muted disabled:opacity-50 text-foreground flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {activeIndex < questions.length - 1 ? (
              <button
                onClick={() => setActiveIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-3.5 py-2 text-xs font-medium bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (window.confirm('Finish examination and submit answers?')) {
                    handleSubmitExam();
                  }
                }}
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Submit Examination
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
