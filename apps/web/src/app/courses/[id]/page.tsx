'use client';

/**
 * MODULE: Course Management - Course Player, Syllabus & Modules
 */

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { coursesApi } from '@/lib/courses-api';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  PlayCircle,
  Plus,
  Save,
  Video,
} from 'lucide-react';

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const { user, effectiveRole } = useAuth();

  const isTeacher = effectiveRole === UserRole.TEACHER;
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;
  const isStudent = effectiveRole === UserRole.STUDENT;

  const [course, setCourse] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeLesson, setActiveLesson] = React.useState<any | null>(null);
  const [completingId, setCompletingId] = React.useState<string | null>(null);

  // Staff module & lesson creation modal state
  const [showModuleModal, setShowModuleModal] = React.useState(false);
  const [moduleTitle, setModuleTitle] = React.useState('');
  const [moduleDesc, setModuleDesc] = React.useState('');
  const [creatingModule, setCreatingModule] = React.useState(false);

  const [showLessonModal, setShowLessonModal] = React.useState(false);
  const [selectedModuleId, setSelectedModuleId] = React.useState<string>('');
  const [lessonTitle, setLessonTitle] = React.useState('');
  const [lessonContent, setLessonContent] = React.useState('');
  const [lessonVideo, setLessonVideo] = React.useState('');
  const [lessonDuration, setLessonDuration] = React.useState(30);
  const [creatingLesson, setCreatingLesson] = React.useState(false);

  const loadCourse = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await coursesApi.getCourseById(courseId);
      setCourse(data);
      if (!activeLesson && data.modules && data.modules.length > 0 && data.modules[0].lessons?.length > 0) {
        setActiveLesson(data.modules[0].lessons[0]);
      }
    } catch (err) {
      console.error('Failed to load course', err);
    } finally {
      setLoading(false);
    }
  }, [courseId, activeLesson]);

  React.useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const handleCompleteLesson = async (lessonId: string) => {
    setCompletingId(lessonId);
    try {
      await coursesApi.completeLesson(lessonId);
      await loadCourse();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to complete lesson');
    } finally {
      setCompletingId(null);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingModule(true);
    try {
      await coursesApi.createModule(courseId, {
        title: moduleTitle,
        description: moduleDesc,
        order: (course?.modules?.length || 0) + 1,
      });
      setShowModuleModal(false);
      setModuleTitle('');
      setModuleDesc('');
      await loadCourse();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create module');
    } finally {
      setCreatingModule(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingLesson(true);
    try {
      await coursesApi.createLesson(selectedModuleId, {
        title: lessonTitle,
        content: lessonContent,
        videoUrl: lessonVideo || undefined,
        durationMinutes: Number(lessonDuration),
      });
      setShowLessonModal(false);
      setLessonTitle('');
      setLessonContent('');
      setLessonVideo('');
      await loadCourse();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create lesson');
    } finally {
      setCreatingLesson(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
        <h3 className="text-lg font-semibold">Course Not Found</h3>
        <Link
          href="/courses"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/courses"
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {course.code}
              </span>
              {course.subjectName && (
                <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {course.subjectName}
                </span>
              )}
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  course.published
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}
              >
                {course.published ? 'Published' : 'Draft'}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {course.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {course.description || 'Curriculum units, interactive lectures, and modular topics.'}
            </p>
          </div>
        </div>

        {(isTeacher || isAdmin) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModuleModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              Add Module
            </button>
          </div>
        )}
      </div>

      {/* Student Progress Bar */}
      {isStudent && course.isEnrolled && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Course Progress
            </span>
            <span className="font-bold text-primary">{course.progressPercentage}% Complete</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${course.progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Workspace: Left Lesson Content, Right Syllabus Tree */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lesson Player / Content View */}
        <div className="lg:col-span-2 space-y-6">
          {activeLesson ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lesson Content
                  </span>
                  <h2 className="mt-1 text-xl font-bold text-foreground">
                    {activeLesson.title}
                  </h2>
                </div>

                {isStudent && course.isEnrolled && (
                  <button
                    onClick={() => handleCompleteLesson(activeLesson.id)}
                    disabled={completingId === activeLesson.id || activeLesson.isCompleted}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-colors ${
                      activeLesson.isCompleted
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {activeLesson.isCompleted ? 'Completed' : 'Mark as Complete'}
                  </button>
                )}
              </div>

              {activeLesson.videoUrl && (
                <div className="rounded-lg bg-black/5 p-4 border border-border flex items-center gap-3">
                  <PlayCircle className="h-8 w-8 text-primary shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-foreground">Lecture Video Link</p>
                    <a
                      href={activeLesson.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline truncate block"
                    >
                      {activeLesson.videoUrl}
                    </a>
                  </div>
                </div>
              )}

              <div className="whitespace-pre-wrap rounded-lg bg-background p-5 text-sm leading-relaxed text-foreground/90 border border-border/50">
                {activeLesson.content}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              Select a lesson from the syllabus outline to view study materials.
            </div>
          )}
        </div>

        {/* Syllabus / Module Accordion Outline */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Syllabus Outline
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {course.totalModules || 0} Modules • {course.totalLessons || 0} Total Lessons
            </p>
          </div>

          <div className="space-y-3">
            {course.modules?.map((module: any, idx: number) => (
              <div key={module.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="bg-muted/40 p-3.5 border-b border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">
                      Module {idx + 1}
                    </span>
                    <h4 className="text-sm font-semibold text-foreground">{module.title}</h4>
                  </div>
                  {(isTeacher || isAdmin) && (
                    <button
                      onClick={() => {
                        setSelectedModuleId(module.id);
                        setShowLessonModal(true);
                      }}
                      className="rounded border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
                    >
                      + Lesson
                    </button>
                  )}
                </div>

                <div className="divide-y divide-border/50">
                  {module.lessons?.map((lesson: any) => (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson)}
                      className={`w-full text-left p-3 flex items-center justify-between text-xs transition-colors hover:bg-accent/40 ${
                        activeLesson?.id === lesson.id ? 'bg-primary/10 font-semibold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{lesson.title}</span>
                      </div>
                      {lesson.isCompleted && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleCreateModule}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
          >
            <h3 className="text-lg font-bold text-foreground">Add Course Module</h3>
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Module Title *
              </label>
              <input
                type="text"
                required
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="e.g. Unit 1: Foundations & Architecture"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Description
              </label>
              <textarea
                rows={3}
                value={moduleDesc}
                onChange={(e) => setModuleDesc(e.target.value)}
                placeholder="Brief summary of concepts covered..."
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModuleModal(false)}
                className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingModule}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creatingModule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Module
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleCreateLesson}
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4"
          >
            <h3 className="text-lg font-bold text-foreground">Add Lesson to Module</h3>
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Lesson Title *
              </label>
              <input
                type="text"
                required
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="e.g. 1.1 Introduction to Graph Queries"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground">
                Lesson Content / Notes *
              </label>
              <textarea
                rows={6}
                required
                value={lessonContent}
                onChange={(e) => setLessonContent(e.target.value)}
                placeholder="Detailed explanation, reading materials, code examples..."
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground">
                  Video / Stream Link (Optional)
                </label>
                <input
                  type="text"
                  value={lessonVideo}
                  onChange={(e) => setLessonVideo(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLessonModal(false)}
                className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingLesson}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creatingLesson ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Lesson
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
