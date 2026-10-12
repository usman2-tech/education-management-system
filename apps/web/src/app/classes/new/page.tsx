'use client';

/**
 * MODULE: Create School Class
 *
 * PURPOSE:
 * Form allowing School Administrators to configure curriculum grade levels.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { createClass } from '@/lib/classes-api';
import {
  BookOpen,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Save,
} from 'lucide-react';

export default function NewClassPage() {
  const router = useRouter();
  const { effectiveRole } = useAuth();
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [order, setOrder] = React.useState<number>(10);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isAdmin) {
      router.push('/classes');
    }
  }, [isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Please provide Class Name and unique Class Code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createClass({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        order: Number(order) || 0,
      });

      router.push(`/classes/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create class:', err);
      setError(err.message || 'Failed to create school class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/classes"
          className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create School Class
          </h1>
          <p className="text-sm text-muted-foreground">
            Define a curriculum grade level or institutional academic tier.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl border border-border bg-card space-y-5 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Class Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Grade 12"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Class Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. G12"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Display Sort Order
            </label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              placeholder="12"
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Secondary Senior Level preparing for university examinations."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
          <Link
            href="/classes"
            className="px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition shadow-sm text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create Class
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
