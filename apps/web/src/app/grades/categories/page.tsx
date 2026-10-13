'use client';

/**
 * MODULE: Grades & Academic Performance - Assessment Categories
 *
 * PURPOSE:
 * Manage institutional assessment categories (Quiz, Homework, Midterm, Final Exam)
 * and their weighting percentages for final grade calculations.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  AssessmentCategoryDto,
  CreateAssessmentCategoryRequest,
  UserRole,
} from '@ems/contracts';
import {
  fetchAssessmentCategories,
  createAssessmentCategory,
  updateAssessmentCategory,
  deleteAssessmentCategory,
} from '@/lib/grades-api';
import {
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Layers,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

export default function AssessmentCategoriesPage() {
  const { user, effectiveRole } = useAuth();
  const isAuthorized =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const [categories, setCategories] = React.useState<AssessmentCategoryDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form state
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [weightPercentage, setWeightPercentage] = React.useState(10);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAssessmentCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const totalWeight = categories.reduce((sum, c) => sum + c.weightPercentage, 0);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setWeightPercentage(15);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: AssessmentCategoryDto) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setWeightPercentage(cat.weightPercentage);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingId) {
        await updateAssessmentCategory(editingId, {
          name,
          description: description || undefined,
          weightPercentage: Number(weightPercentage),
        });
      } else {
        const payload: CreateAssessmentCategoryRequest = {
          name,
          description: description || undefined,
          weightPercentage: Number(weightPercentage),
          schoolId: user?.schoolId || undefined,
        };
        await createAssessmentCategory(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assessment category?')) return;
    try {
      await deleteAssessmentCategory(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

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
              <Layers className="h-6 w-6 text-primary" />
              Assessment Categories
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure curriculum categories and their weighted percentages.
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
          {isAuthorized && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Category
            </button>
          )}
        </div>
      </div>

      {/* Weight Summary Banner */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs font-medium mb-2">
          <span className="text-muted-foreground">Total Cumulative Category Weight</span>
          <span className={`font-bold ${totalWeight === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {totalWeight}% {totalWeight === 100 ? '(Balanced)' : `(${100 - totalWeight}% unallocated)`}
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              totalWeight === 100 ? 'bg-emerald-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(100, totalWeight)}%` }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No categories found. Click &quot;Add Category&quot; to configure your assessment weighting scheme.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">{cat.name}</h3>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-extrabold text-primary flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    {cat.weightPercentage}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {cat.description || 'No description provided.'}
                </p>
              </div>

              {isAuthorized && (
                <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {editingId ? 'Edit Category' : 'Create Assessment Category'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-md bg-destructive/15 p-3 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Examination"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Weight Percentage (%) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={weightPercentage}
                  onChange={(e) => setWeightPercentage(Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Evaluation guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
