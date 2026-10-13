'use client';

/**
 * MODULE: Grades & Academic Performance - Assessment Overview
 *
 * PURPOSE:
 * Detailed inspection of an individual assessment, status, parameters,
 * and quick navigation to classroom gradebook.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  AssessmentDto,
  AssessmentGradebookDto,
  AssessmentStatus,
  UserRole,
} from '@ems/contracts';
import {
  fetchAssessmentById,
  fetchAssessmentGradebook,
  publishAssessment,
} from '@/lib/grades-api';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Users,
} from 'lucide-react';

export default function AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user, effectiveRole } = useAuth();

  const isStaff =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN ||
    effectiveRole === UserRole.TEACHER;

  const [assessment, setAssessment] = React.useState<AssessmentDto | null>(null);
  const [gradebook, setGradebook] = React.useState<AssessmentGradebookDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [publishing, setPublishing] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [assess, gb] = await Promise.all([
        fetchAssessmentById(id),
        fetchAssessmentGradebook(id).catch(() => null),
      ]);
      setAssessment(assess);
      setGradebook(gb);
    } catch (err) {
      console.error('Failed to load assessment details', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublish = async () => {
    if (!assessment) return;
    if (!confirm('Are you sure you want to publish this assessment? Results will immediately be visible to enrolled students and verified guardians.')) {
      return;
    }

    setPublishing(true);
    try {
      await publishAssessment(assessment.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to publish assessment');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        Assessment not found.
      </div>
    );
  }

  const gradedCount = gradebook?.students.filter((s) => s.marksObtained !== null).length ?? 0;
  const totalStudents = gradebook?.students.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/grades/assessments"
            className="rounded-lg border border-border p-2 hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{assessment.title}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                  assessment.status === AssessmentStatus.PUBLISHED
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                }`}
              >
                {assessment.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Subject: {assessment.subject?.name} • Class: {assessment.classSection?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {assessment.status === AssessmentStatus.DRAFT && isStaff && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Publish Assessment
            </button>
          )}

          <Link
            href={`/grades/assessments/${assessment.id}/gradebook`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Award className="h-3.5 w-3.5" />
            Open Gradebook
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">Maximum Marks</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{assessment.maximumMarks}</div>
          <div className="text-[11px] text-muted-foreground">Evaluation basis</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">Weight Percentage</div>
          <div className="mt-1 text-2xl font-bold text-primary">
            {assessment.category?.weightPercentage ?? 0}%
          </div>
          <div className="text-[11px] text-muted-foreground">
            Category: {assessment.category?.name || 'General'}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">Grading Progress</div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {gradedCount} / {totalStudents}
          </div>
          <div className="text-[11px] text-muted-foreground">Enrolled students graded</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">Assessment Date</div>
          <div className="mt-1 text-base font-bold text-foreground">
            {new Date(assessment.assessmentDate).toLocaleDateString()}
          </div>
          <div className="text-[11px] text-muted-foreground">Scheduled examination</div>
        </div>
      </div>

      {/* Details Box */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Curriculum & Scope</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {assessment.description || 'No additional scope or rubric details provided.'}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 border-t border-border pt-4 text-xs">
          <div>
            <span className="text-muted-foreground">Class Section:</span>{' '}
            <strong className="text-foreground">{assessment.classSection?.name}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Course Code:</span>{' '}
            <strong className="text-foreground">{assessment.subject?.code}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Created At:</span>{' '}
            <span>{new Date(assessment.createdAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Last Updated:</span>{' '}
            <span>{new Date(assessment.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
