'use client';

/**
 * MODULE: Grades & Academic Performance - Create Assessment
 *
 * PURPOSE:
 * Form for teachers and administrators to create new assessments
 * scoped by class section, subject, category, and date.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  AssessmentCategoryDto,
  ClassSectionDto,
  CreateAssessmentRequest,
  SubjectDto,
  UserRole,
} from '@ems/contracts';
import {
  createAssessment,
  fetchAssessmentCategories,
} from '@/lib/grades-api';
import {
  fetchSections,
  fetchSubjects,
} from '@/lib/classes-api';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Layers,
  Loader2,
  Users,
} from 'lucide-react';

export default function NewAssessmentPage() {
  const router = useRouter();
  const { user, effectiveRole } = useAuth();

  const isStaff =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN ||
    effectiveRole === UserRole.TEACHER;

  const [categories, setCategories] = React.useState<AssessmentCategoryDto[]>([]);
  const [sections, setSections] = React.useState<ClassSectionDto[]>([]);
  const [subjects, setSubjects] = React.useState<SubjectDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Form state
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [classSectionId, setClassSectionId] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [maximumMarks, setMaximumMarks] = React.useState<number>(100);
  const [assessmentDate, setAssessmentDate] = React.useState<string>(
    new Date().toISOString().split('T')[0],
  );

  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadOptions() {
      try {
        const [cats, secs, subs] = await Promise.all([
          fetchAssessmentCategories(),
          fetchSections(),
          fetchSubjects(),
        ]);
        setCategories(cats);
        setSections(secs);
        setSubjects(subs);

        if (cats.length > 0) setCategoryId(cats[0].id);
        if (secs.length > 0) setClassSectionId(secs[0].id);
        if (subs.length > 0) setSubjectId(subs[0].id);
      } catch (err) {
        console.error('Failed to load assessment form dependencies', err);
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classSectionId || !subjectId || !categoryId) {
      setErrorMsg('Please select a class section, subject, and category.');
      return;
    }
    if (maximumMarks <= 0) {
      setErrorMsg('Maximum marks must be greater than zero.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: CreateAssessmentRequest = {
        title,
        description: description || undefined,
        classSectionId,
        subjectId,
        categoryId,
        maximumMarks: Number(maximumMarks),
        assessmentDate,
        academicYearId: sections.find((s) => s.id === classSectionId)?.academicYearId,
        schoolId: user?.schoolId || undefined,
      };

      const created = await createAssessment(payload);
      // Navigate straight to gradebook to allow instant grade entry
      router.push(`/grades/assessments/${created.id}/gradebook`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create assessment.');
      setSubmitting(false);
    }
  };

  if (!isStaff) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center text-sm text-destructive">
        You do not have permissions to create assessments.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/grades/assessments"
          className="rounded-lg border border-border p-2 hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Create Assessment
          </h1>
          <p className="text-sm text-muted-foreground">
            Schedule a test, exam, or quiz and initialize the classroom gradebook.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {errorMsg && (
            <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs text-destructive">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Assessment Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Unit 3 Trigonometry Test"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Class Section *
                </label>
                <select
                  required
                  value={classSectionId}
                  onChange={(e) => setClassSectionId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.className || 'Class'} — Section {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Subject *
                </label>
                <select
                  required
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Category *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.weightPercentage}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Maximum Marks *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={1000}
                  value={maximumMarks}
                  onChange={(e) => setMaximumMarks(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Assessment Date *
                </label>
                <input
                  type="date"
                  required
                  value={assessmentDate}
                  onChange={(e) => setAssessmentDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Description / Curriculum Scope (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Key topics covered, rubrics or special instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Link
                href="/grades/assessments"
                className="rounded-md border border-input px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create & Open Gradebook
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
