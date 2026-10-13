'use client';

/**
 * MODULE: Institutional Subjects Management
 *
 * PURPOSE:
 * Academic course catalog: managing curriculum subjects, subject codes,
 * academic departments, and credit weights.
 */

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { SubjectDto, UserRole } from '@ems/contracts';
import { fetchSubjects, createSubject } from '@/lib/classes-api';
import {
  FileText,
  Plus,
  Loader2,
  AlertCircle,
  GraduationCap,
  Layers,
} from 'lucide-react';

export default function SubjectsPage() {
  const { effectiveRole } = useAuth();
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const [subjects, setSubjects] = React.useState<SubjectDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [department, setDepartment] = React.useState('General Sciences');
  const [credits, setCredits] = React.useState(1.0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const loadSubjects = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSubjects();
      setSubjects(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load curriculum subjects.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setFormError('Please specify subject name and code.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await createSubject({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        department: department.trim() || undefined,
        credits: Number(credits) || 1.0,
      });

      setIsModalOpen(false);
      setName('');
      setCode('');
      await loadSubjects();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create subject.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Curriculum Subjects
            </h1>
            <p className="text-sm text-muted-foreground">
              Institutional course registry, academic departments, and instructional credits.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="py-20 flex justify-center items-center text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Loading subjects...</span>
        </div>
      ) : subjects.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card p-6 space-y-2">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-bold text-foreground text-base">No Subjects Defined</h3>
          <p className="text-xs text-muted-foreground">
            Configure subjects to assign teachers and schedule timetable periods.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className="p-5 rounded-2xl border border-border bg-card space-y-3 shadow-sm hover:border-primary/40 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-foreground text-base">{sub.name}</h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                    {sub.code}
                  </span>
                </div>

                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  {sub.credits} Credits
                </span>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-primary/70" />
                  {sub.department || 'General Curriculum'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-base">New Subject</h3>
              <button onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Calculus"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MATH-201"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Academic Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics & Computing"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  {isSubmitting ? 'Creating...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
