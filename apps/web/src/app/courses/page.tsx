'use client';

/**
 * MODULE: Course Management - Catalog & Student Courses
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { UserRole, CourseDto } from '@ems/contracts';
import { coursesApi } from '@/lib/courses-api';
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  ChevronRight,
} from 'lucide-react';

export default function CoursesPage() {
  const { user, effectiveRole } = useAuth();
  const isTeacher = effectiveRole === UserRole.TEACHER;
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;
  const isStudent = effectiveRole === UserRole.STUDENT;

  const [courses, setCourses] = React.useState<CourseDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [enrollingId, setEnrollingId] = React.useState<string | null>(null);

  const loadCourses = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await coursesApi.getCourses();
      setCourses(data);
    } catch (err) {
      console.error('Failed to load courses', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleEnroll = async (e: React.MouseEvent, courseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setEnrollingId(courseId);
    try {
      await coursesApi.enrollCourse(courseId);
      await loadCourses();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to enroll');
    } finally {
      setEnrollingId(null);
    }
  };

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.subjectName && c.subjectName.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            Course Catalog & Curriculum
          </h1>
          <p className="text-sm text-muted-foreground">
            {isStudent
              ? 'Explore courses, track learning modules, and complete lesson material'
              : 'Institutional course catalogs, module syllabus, and student enrollments'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCourses}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {(isTeacher || isAdmin) && (
            <Link
              href="/courses/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Course
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search courses by code, title, or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-semibold text-foreground">No courses available</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? 'Try modifying your search query.' : 'No courses have been created yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {course.code}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      course.published
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {course.published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                {course.subjectName && (
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    Subject: {course.subjectName}
                  </p>
                )}
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {course.description || 'Comprehensive curriculum modules and interactive learning resources.'}
                </p>
              </div>

              <div className="border-t border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {course.totalModules || 0} Modules • {course.totalLessons || 0} Lessons
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Users className="h-3.5 w-3.5" />
                    {course.enrolledStudentsCount || 0} enrolled
                  </span>
                </div>

                {isStudent && (
                  <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                    {course.isEnrolled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" /> Enrolled
                      </span>
                    ) : (
                      <button
                        onClick={(e) => handleEnroll(e, course.id)}
                        disabled={enrollingId === course.id}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {enrollingId === course.id ? 'Enrolling...' : 'Enroll in Course'}
                      </button>
                    )}
                    <span className="inline-flex items-center text-xs font-medium text-primary group-hover:underline">
                      View Syllabus <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
