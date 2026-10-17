'use client';

/**
 * MODULE: Course Management - Create Course Page
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { coursesApi } from '@/lib/courses-api';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, BookOpen, Loader2, Save } from 'lucide-react';

export default function NewCoursePage() {
  const router = useRouter();

  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    title: '',
    code: '',
    subjectId: '',
    description: '',
    thumbnailUrl: '',
    published: true,
  });

  React.useEffect(() => {
    async function loadMeta() {
      try {
        const subs = await apiClient.get<any[]>('/subjects');
        setSubjects(subs || []);
        if (subs && subs.length > 0) {
          setFormData((prev) => ({ ...prev, subjectId: subs[0].id }));
        }
      } catch (err) {
        console.error('Failed to load subjects', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadMeta();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!formData.title || !formData.code) {
        throw new Error('Title and course code are required.');
      }

      await coursesApi.createCourse({
        title: formData.title,
        code: formData.code,
        subjectId: formData.subjectId || undefined,
        description: formData.description || undefined,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        published: formData.published,
      });

      router.push('/courses');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/courses"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Create Course
          </h1>
          <p className="text-sm text-muted-foreground">
            Define institutional course title, curriculum code, and learning objectives.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Course Code *
            </label>
            <input
              type="text"
              placeholder="e.g. CS-201"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Associated Subject
            </label>
            <select
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">No subject link</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Course Title *
          </label>
          <input
            type="text"
            placeholder="e.g. Data Structures and Algorithm Analysis"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Description & Course Syllabus Overview
          </label>
          <textarea
            rows={4}
            placeholder="Overview of course topics, prerequisites, and learning outcomes..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="published"
            checked={formData.published}
            onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="published" className="text-sm font-medium text-foreground cursor-pointer">
            Publish immediately (Visible in student course catalog)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Link
            href="/courses"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Course
          </button>
        </div>
      </form>
    </div>
  );
}
