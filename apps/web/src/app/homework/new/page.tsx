'use client';

/**
 * MODULE: Homework Management - Create Assignment Page
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { homeworkApi } from '@/lib/homework-api';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, BookOpen, Loader2, Save } from 'lucide-react';

export default function NewHomeworkPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [classes, setClasses] = React.useState<any[]>([]);
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    classSectionId: '',
    subjectId: '',
    title: '',
    instructions: '',
    dueDate: '',
    maxPoints: 100,
    status: 'PUBLISHED',
    attachments: '',
  });

  React.useEffect(() => {
    async function loadMeta() {
      try {
        const [clsRes, subRes] = await Promise.all([
          apiClient.get<any[]>('/classes/sections'),
          apiClient.get<any[]>('/subjects'),
        ]);
        setClasses(clsRes || []);
        setSubjects(subRes || []);
        if (clsRes && clsRes.length > 0) {
          setFormData((prev) => ({ ...prev, classSectionId: clsRes[0].id }));
        }
        if (subRes && subRes.length > 0) {
          setFormData((prev) => ({ ...prev, subjectId: subRes[0].id }));
        }
      } catch (err) {
        console.error('Failed to load classes/subjects', err);
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
      if (!formData.classSectionId || !formData.subjectId || !formData.title || !formData.dueDate) {
        throw new Error('Please fill out all required fields.');
      }

      await homeworkApi.createHomework({
        classSectionId: formData.classSectionId,
        subjectId: formData.subjectId,
        title: formData.title,
        instructions: formData.instructions,
        dueDate: new Date(formData.dueDate).toISOString(),
        maxPoints: Number(formData.maxPoints),
        status: formData.status as any,
        attachments: formData.attachments || undefined,
      });

      router.push('/homework');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create homework');
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/homework"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Create Assignment
          </h1>
          <p className="text-sm text-muted-foreground">
            Assign homework to a class section and configure instructions & due dates.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Class Section *
            </label>
            <select
              value={formData.classSectionId}
              onChange={(e) => setFormData({ ...formData, classSectionId: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.schoolClass?.name || cls.className} - {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Subject *
            </label>
            <select
              value={formData.subjectId}
              onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
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
            Assignment Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Chapter 4 Trigonometry Problem Set"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Instructions & Details *
          </label>
          <textarea
            rows={5}
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            placeholder="Detailed instructions for students, problem numbers, submission requirements..."
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Due Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Maximum Points
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={formData.maxPoints}
              onChange={(e) => setFormData({ ...formData, maxPoints: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="PUBLISHED">Published (Visible to Students)</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Attachments / Resource URL (Optional)
          </label>
          <input
            type="text"
            value={formData.attachments}
            onChange={(e) => setFormData({ ...formData, attachments: e.target.value })}
            placeholder="https://..."
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Link
            href="/homework"
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
            Save Assignment
          </button>
        </div>
      </form>
    </div>
  );
}
