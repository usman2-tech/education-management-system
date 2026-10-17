'use client';

/**
 * MODULE: Homework Management - Directory & Dashboard
 *
 * PURPOSE:
 * Role-adaptive listing for homework assignments. Teachers view assigned classes and
 * submission counters; Students view homework tasks with due dates and submission state;
 * Parents see homework for verified children; Admins have schoolwide oversight.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { homeworkApi } from '@/lib/homework-api';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  FileText,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

export default function HomeworkPage() {
  const { user, effectiveRole } = useAuth();
  const isTeacher = effectiveRole === UserRole.TEACHER;
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;
  const isStudent = effectiveRole === UserRole.STUDENT;

  const [homeworks, setHomeworks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  const loadHomeworks = React.useCallback(async () => {
    setLoading(true);
    try {
      if (isStudent && user?.id) {
        const studentHw = await homeworkApi.getStudentHomeworks(user.id);
        setHomeworks(studentHw);
      } else {
        const data = await homeworkApi.getHomeworks();
        setHomeworks(data);
      }
    } catch (err) {
      console.error('Failed to load homework:', err);
    } finally {
      setLoading(false);
    }
  }, [isStudent, user?.id]);

  React.useEffect(() => {
    loadHomeworks();
  }, [loadHomeworks]);

  const filtered = homeworks.filter((hw) => {
    const matchesSearch =
      hw.title.toLowerCase().includes(search.toLowerCase()) ||
      (hw.subjectName && hw.subjectName.toLowerCase().includes(search.toLowerCase())) ||
      (hw.className && hw.className.toLowerCase().includes(search.toLowerCase()));

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && hw.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            Homework & Assignments
          </h1>
          <p className="text-sm text-muted-foreground">
            {isStudent
              ? 'View your class homework assignments and track your submission status'
              : 'Manage assignments, review student submissions, and record feedback'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadHomeworks}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {(isTeacher || isAdmin) && (
            <Link
              href="/homework/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Assignment
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, subject, or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="CLOSED">Closed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-semibold text-foreground">No homework found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || statusFilter !== 'ALL'
              ? 'Try adjusting your search filters.'
              : 'No assignments have been published yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((hw) => {
            const dueDate = new Date(hw.dueDate);
            const isPastDue = dueDate < new Date();

            return (
              <Link
                key={hw.id}
                href={`/homework/${hw.id}`}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {hw.subjectName || hw.subjectCode}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                        hw.status === 'PUBLISHED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : hw.status === 'DRAFT'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {hw.status}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-foreground group-hover:text-primary">
                    {hw.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {hw.instructions}
                  </p>
                </div>

                <div className="mt-4 border-t border-border/50 pt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Due {dueDate.toLocaleDateString()}
                    </span>
                    <span className="font-medium text-foreground">
                      {hw.maxPoints} pts
                    </span>
                  </div>

                  {isStudent && hw.submission && (
                    <div className="mt-2 flex items-center justify-between rounded-md bg-accent/50 px-2.5 py-1 text-xs">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Submitted
                      </span>
                      {hw.submission.grade !== null && hw.submission.grade !== undefined ? (
                        <span className="font-semibold text-foreground">
                          {hw.submission.grade} / {hw.maxPoints}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Pending Grade</span>
                      )}
                    </div>
                  )}

                  {!isStudent && (
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Class: {hw.className} {hw.sectionName}</span>
                      <span className="flex items-center text-primary font-medium group-hover:underline">
                        View details <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
