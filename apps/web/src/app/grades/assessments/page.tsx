'use client';

/**
 * MODULE: Grades & Academic Performance - Assessments Directory
 *
 * PURPOSE:
 * Searchable, filterable list of all institutional assessments across classes and subjects.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  AssessmentDto,
  AssessmentStatus,
  UserRole,
} from '@ems/contracts';
import {
  fetchAssessments,
  publishAssessment,
} from '@/lib/grades-api';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function AssessmentsDirectoryPage() {
  const { user, effectiveRole } = useAuth();
  const isStaff =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN ||
    effectiveRole === UserRole.TEACHER;

  const [assessments, setAssessments] = React.useState<AssessmentDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAssessments();
      setAssessments(data);
    } catch (err) {
      console.error('Failed to load assessments', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublish = async (id: string) => {
    if (!confirm('Are you sure you want to publish this assessment? Results will become visible to enrolled students and verified guardians.')) {
      return;
    }
    setActionLoadingId(id);
    try {
      await publishAssessment(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to publish assessment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = assessments.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.subject?.name && item.subject.name.toLowerCase().includes(search.toLowerCase())) ||
      (item.classSection?.name && item.classSection.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/grades"
            className="rounded-lg border border-border p-2 hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              Assessments Directory
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and manage all curriculum assessments, quizzes, exams, and grading records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {isStaff && (
            <Link
              href="/grades/assessments/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Assessment
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, subject, or class section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value={AssessmentStatus.PUBLISHED}>Published</option>
            <option value={AssessmentStatus.DRAFT}>Draft (Pending)</option>
          </select>
        </div>
      </div>

      {/* Assessments Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No matching assessments found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-primary/50 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      item.status === AssessmentStatus.PUBLISHED
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                    }`}
                  >
                    {item.status}
                  </span>
                  {item.category && (
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {item.category.name} ({item.category.weightPercentage}%)
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-foreground line-clamp-1">{item.title}</h3>

                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}

                <div className="border-t border-border pt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Subject:</span>
                    <strong className="text-foreground">{item.subject?.name || 'Assigned'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Class Section:</span>
                    <strong className="text-foreground">{item.classSection?.name || 'Class'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Max Marks:</span>
                    <strong className="text-foreground">{item.maximumMarks}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Date:</span>
                    <span>{new Date(item.assessmentDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <Link
                  href={`/grades/assessments/${item.id}`}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Details
                </Link>

                <div className="flex items-center gap-2">
                  {item.status === AssessmentStatus.DRAFT && isStaff && (
                    <button
                      onClick={() => handlePublish(item.id)}
                      disabled={actionLoadingId === item.id}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                      {actionLoadingId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      Publish
                    </button>
                  )}

                  <Link
                    href={`/grades/assessments/${item.id}/gradebook`}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Award className="h-3 w-3" />
                    Gradebook
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
