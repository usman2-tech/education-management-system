'use client';

/**
 * MODULE: Exam Management - Create Examination & Questions
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { examsApi } from '@/lib/exams-api';
import { fetchSections, fetchSubjects } from '@/lib/classes-api';
import { ExamQuestionType, ExamStatus } from '@ems/contracts';
import {
  Award,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle,
  HelpCircle,
  FileText,
  Loader2,
  Calendar,
  Clock,
} from 'lucide-react';

interface QuestionFormItem {
  id: string;
  questionText: string;
  questionType: ExamQuestionType;
  options: string[];
  correctAnswer: string;
  marks: number;
}

export default function CreateExamPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [sections, setSections] = React.useState<any[]>([]);
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [classSectionId, setClassSectionId] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  const [examDate, setExamDate] = React.useState(
    new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
  );
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('10:30');
  const [durationMinutes, setDurationMinutes] = React.useState(90);
  const [passingMarks, setPassingMarks] = React.useState(40);
  const [status, setStatus] = React.useState<ExamStatus>('SCHEDULED');

  // Interactive questions
  const [questions, setQuestions] = React.useState<QuestionFormItem[]>([
    {
      id: '1',
      questionText: 'What is the primary formula for Newton’s Second Law of Motion?',
      questionType: 'MULTIPLE_CHOICE',
      options: ['F = m * a', 'E = m * c^2', 'v = d / t', 'p = m * v'],
      correctAnswer: 'F = m * a',
      marks: 5,
    },
    {
      id: '2',
      questionText: 'The kinetic energy of an object is directly proportional to the square of its speed.',
      questionType: 'TRUE_FALSE',
      options: ['True', 'False'],
      correctAnswer: 'True',
      marks: 5,
    },
  ]);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [secRes, subRes] = await Promise.all([
          fetchSections(),
          fetchSubjects(),
        ]);
        setSections(secRes);
        setSubjects(subRes);
        if (secRes.length > 0) setClassSectionId(secRes[0].id);
        if (subRes.length > 0) setSubjectId(subRes[0].id);
      } catch (err) {
        console.error('Failed to load sections/subjects for exam form:', err);
      } finally {
        setLoadingLookups(false);
      }
    }
    loadData();
  }, []);

  const totalCalculatedMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

  const addQuestion = (type: ExamQuestionType) => {
    const newId = String(Date.now());
    if (type === 'MULTIPLE_CHOICE') {
      setQuestions((prev) => [
        ...prev,
        {
          id: newId,
          questionText: '',
          questionType: 'MULTIPLE_CHOICE',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'Option A',
          marks: 5,
        },
      ]);
    } else if (type === 'TRUE_FALSE') {
      setQuestions((prev) => [
        ...prev,
        {
          id: newId,
          questionText: '',
          questionType: 'TRUE_FALSE',
          options: ['True', 'False'],
          correctAnswer: 'True',
          marks: 5,
        },
      ]);
    } else {
      setQuestions((prev) => [
        ...prev,
        {
          id: newId,
          questionText: '',
          questionType: type,
          options: [],
          correctAnswer: '',
          marks: 10,
        },
      ]);
    }
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<QuestionFormItem>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !classSectionId || !subjectId) {
      setError('Please fill in all mandatory fields (Title, Class Section, Subject).');
      return;
    }
    if (questions.length === 0) {
      setError('Please add at least one question to the exam.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await examsApi.createExam({
        title,
        description: description || undefined,
        classSectionId,
        subjectId,
        examDate,
        startTime,
        endTime,
        durationMinutes: Number(durationMinutes),
        totalMarks: totalCalculatedMarks,
        passingMarks: Number(passingMarks),
        status,
        questions: questions.map((q, idx) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options.length > 0 ? q.options : undefined,
          correctAnswer: q.correctAnswer || undefined,
          marks: Number(q.marks),
          order: idx,
        })),
      });

      router.push('/exams');
    } catch (err: any) {
      console.error('Failed to create exam:', err);
      setError(err?.message || 'Failed to create exam. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/exams"
          className="p-2 border border-border rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Create Institutional Examination
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure examination schedule, time windows, and author objective or subjective questions.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Exam Overview & Scheduling
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Exam Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Midterm Examination: Mechanics & Waves"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Description / Guidelines
              </label>
              <textarea
                rows={2}
                placeholder="Instructions for students (calculators permitted, no external notes, etc.)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Class & Section *
              </label>
              <select
                required
                value={classSectionId}
                onChange={(e) => setClassSectionId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.sectionName || `Section ${s.id.substring(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Subject *
              </label>
              <select
                required
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Exam Date *
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Duration (Minutes) *
              </label>
              <input
                type="number"
                min={5}
                max={480}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Time Window (Start - End)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExamStatus)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
              >
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
              </select>
            </div>
          </div>
        </div>

        {/* Question Bank Builder */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Assessment Questions ({questions.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Total Marks: <strong className="text-foreground">{totalCalculatedMarks}</strong> | Passing Marks: <strong className="text-foreground">{passingMarks}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => addQuestion('MULTIPLE_CHOICE')}
                className="px-2.5 py-1.5 text-xs bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg border border-border flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                + MCQ
              </button>
              <button
                type="button"
                onClick={() => addQuestion('TRUE_FALSE')}
                className="px-2.5 py-1.5 text-xs bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg border border-border flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                + True/False
              </button>
              <button
                type="button"
                onClick={() => addQuestion('SHORT_ANSWER')}
                className="px-2.5 py-1.5 text-xs bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg border border-border flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                + Short/Essay
              </button>
            </div>
          </div>

          <div className="space-y-4 mt-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-border bg-background space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                    Q{idx + 1} • {q.questionType.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Marks:</span>
                      <input
                        type="number"
                        min={0.5}
                        max={100}
                        value={q.marks}
                        onChange={(e) => updateQuestion(q.id, { marks: Number(e.target.value) })}
                        className="w-16 px-2 py-1 text-xs bg-card border border-input rounded text-center"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      title="Remove question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    required
                    placeholder="Enter question text here..."
                    value={q.questionText}
                    onChange={(e) => updateQuestion(q.id, { questionText: e.target.value })}
                    className="w-full px-3 py-2 bg-card border border-input rounded-lg text-sm"
                  />
                </div>

                {/* Multiple Choice Options */}
                {q.questionType === 'MULTIPLE_CHOICE' && (
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Options (Select the correct radio option):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctAnswer === opt}
                            onChange={() => updateQuestion(q.id, { correctAnswer: opt })}
                            className="h-4 w-4 text-primary"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...q.options];
                              newOpts[optIdx] = e.target.value;
                              const isSelected = q.correctAnswer === opt;
                              updateQuestion(q.id, {
                                options: newOpts,
                                correctAnswer: isSelected ? e.target.value : q.correctAnswer,
                              });
                            }}
                            className="w-full px-2.5 py-1.5 bg-card border border-input rounded text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* True / False Options */}
                {q.questionType === 'TRUE_FALSE' && (
                  <div className="flex items-center gap-4 pt-1">
                    <span className="text-xs font-semibold text-muted-foreground">Correct Answer:</span>
                    <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name={`tf-${q.id}`}
                        value="True"
                        checked={q.correctAnswer === 'True'}
                        onChange={() => updateQuestion(q.id, { correctAnswer: 'True' })}
                        className="h-4 w-4 text-primary"
                      />
                      True
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name={`tf-${q.id}`}
                        value="False"
                        checked={q.correctAnswer === 'False'}
                        onChange={() => updateQuestion(q.id, { correctAnswer: 'False' })}
                        className="h-4 w-4 text-primary"
                      />
                      False
                    </label>
                  </div>
                )}

                {/* Short / Written Guidelines */}
                {(q.questionType === 'SHORT_ANSWER' || q.questionType === 'ESSAY') && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Grading Guideline / Model Answer (For teacher grading):
                    </label>
                    <input
                      type="text"
                      placeholder="Key keywords or rubric expectations..."
                      value={q.correctAnswer || ''}
                      onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-card border border-input rounded text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/exams"
            className="px-4 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted text-foreground transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save & Publish Exam
          </button>
        </div>
      </form>
    </div>
  );
}
