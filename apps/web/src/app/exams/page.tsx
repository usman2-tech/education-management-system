'use client';

/**
 * MODULE: Exam Management - Directory & Schedules
 *
 * PURPOSE:
 * Displays exam schedules and assessments with role-scoped capabilities.
 * Teachers & Admins can create, schedule, and grade exams.
 * Students can view upcoming exams and launch the online test-taking interface.
 * Parents can view published exam assessments for linked children.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { UserRole, ExamStatus } from '@ems/contracts';
import { examsApi } from '@/lib/exams-api';
import {
  Award,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  FileCheck,
  AlertCircle,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export default function ExamsPage() {
  const { user, effectiveRole } = useAuth();
  const isTeacher = effectiveRole === UserRole.TEACHER;
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;
  const isStudent = effectiveRole === UserRole.STUDENT;
  const canManage = isTeacher || isAdmin;

  const [exams, setExams] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  const loadExams = React.useCallback(async () => {
    setLoading(true);
    try {
      if (isStudent && user?.id) {
        // Students load their assigned exams
        const data = await examsApi.getExams();
        setExams(data);
      } else {
        const data = await examsApi.getExams();
        setExams(data);
      }
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  }, [isStudent, user?.id]);

  React.useEffect(() => {
    loadExams();
  }, [loadExams]);

  const filtered = exams.filter((ex) => {
    const matchSearch =
      ex.title.toLowerCase().includes(search.toLowerCase()) ||
      (ex.subjectName && ex.subjectName.toLowerCase().includes(search.toLowerCase())) ||
      (ex.className && ex.className.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = statusFilter === 'ALL' || ex.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Examinations & Assessments
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage institutional exam timetables, question banks, online assessment delivery, and gradebook publication.
          </p>
        </div>

        {canManage && (
          <Link
            href="/exams/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Exam
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search exams by title, subject, or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-input rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="RESULTS_PUBLISHED">Results Published</option>
          </select>

          <button
            onClick={loadExams}
            disabled={loading}
            className="p-2 border border-input rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Exam Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <FileCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No examinations found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            {search || statusFilter !== 'ALL'
              ? 'Try adjusting your filters or search terms.'
              : 'No scheduled examinations match your view criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((exam) => {
            const isPublished = exam.status === 'RESULTS_PUBLISHED';
            const isCompleted = exam.status === 'COMPLETED' || isPublished;
            const myAttempt = exam.myAttempt;

            return (
              <div
                key={exam.id}
                className="bg-card border border-border hover:border-primary/50 transition-all rounded-xl p-5 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        exam.status === 'RESULTS_PUBLISHED'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : exam.status === 'SCHEDULED'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : exam.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {exam.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded">
                      {exam.totalMarks} Marks
                    </span>
                  </div>

                  <h3 className="font-semibold text-lg text-foreground line-clamp-1 mb-1">
                    {exam.title}
                  </h3>
                  {exam.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {exam.description}
                    </p>
                  )}

                  <div className="space-y-1.5 text-xs text-muted-foreground my-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      <span>{exam.subjectName || 'Subject'} • {exam.className || 'Class'} {exam.sectionName || ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Date: {new Date(exam.examDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Duration: {exam.durationMinutes} mins {exam.startTime ? `(${exam.startTime})` : ''}</span>
                    </div>
                    {exam._count?.questions !== undefined && (
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-3.5 w-3.5" />
                        <span>Questions: {exam._count.questions}</span>
                      </div>
                    )}
                  </div>

                  {/* Student Attempt Status */}
                  {isStudent && (
                    <div className="mt-3 p-2.5 bg-muted/50 rounded-lg text-xs">
                      {myAttempt ? (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">Status: {myAttempt.status}</span>
                          {myAttempt.obtainedMarks !== null && (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {myAttempt.obtainedMarks} / {exam.totalMarks} ({myAttempt.percentage}%)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not yet attempted</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-2 border-t border-border flex items-center justify-between">
                  {isStudent ? (
                    myAttempt?.status === 'SUBMITTED' || myAttempt?.status === 'GRADED' ? (
                      <Link
                        href={`/exams/${exam.id}`}
                        className="w-full text-center py-2 px-3 bg-muted hover:bg-muted/80 text-foreground font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        View Result & Summary
                      </Link>
                    ) : (
                      <Link
                        href={`/exams/${exam.id}/take`}
                        className="w-full text-center py-2 px-3 bg-primary hover:bg-primary/90 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Start / Take Exam
                      </Link>
                    )
                  ) : (
                    <Link
                      href={`/exams/${exam.id}`}
                      className="w-full text-center py-2 px-3 bg-primary/10 hover:bg-primary/20 text-primary font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Manage & Review Submissions</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
