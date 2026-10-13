'use client';

/**
 * MODULE: Grades & Academic Performance - Grading Scales Management
 *
 * PURPOSE:
 * Manage institutional letter grade thresholds, percentage boundaries,
 * and GPA grade point equivalents.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  GradingScaleDto,
  CreateGradingScaleRequest,
  UserRole,
} from '@ems/contracts';
import {
  fetchGradingScales,
  createGradingScale,
  updateGradingScale,
} from '@/lib/grades-api';
import {
  ArrowLeft,
  Award,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Sliders,
  X,
} from 'lucide-react';

export default function GradingScalesPage() {
  const { user, effectiveRole } = useAuth();
  const isAuthorized =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const [scales, setScales] = React.useState<GradingScaleDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form state
  const [name, setName] = React.useState('Standard Letter Scale');
  const [letterGrade, setLetterGrade] = React.useState('A');
  const [minPercentage, setMinPercentage] = React.useState<number>(80);
  const [maxPercentage, setMaxPercentage] = React.useState<number>(89.9);
  const [gradePoint, setGradePoint] = React.useState<number>(3.5);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGradingScales();
      setScales(data);
    } catch (err) {
      console.error('Failed to load grading scales', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('Standard Letter Scale');
    setLetterGrade('');
    setMinPercentage(0);
    setMaxPercentage(100);
    setGradePoint(0);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (sc: GradingScaleDto) => {
    setEditingId(sc.id);
    setName(sc.name);
    setLetterGrade(sc.letterGrade);
    setMinPercentage(sc.minimumPercentage);
    setMaxPercentage(sc.maximumPercentage);
    setGradePoint(sc.gradePoint ?? 0);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (minPercentage < 0 || maxPercentage > 100 || minPercentage >= maxPercentage) {
      setErrorMsg('Minimum percentage must be less than maximum percentage, between 0 and 100.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingId) {
        await updateGradingScale(editingId, {
          name,
          letterGrade,
          minimumPercentage: Number(minPercentage),
          maximumPercentage: Number(maxPercentage),
          gradePoint: Number(gradePoint),
        });
      } else {
        const payload: CreateGradingScaleRequest = {
          name,
          letterGrade,
          minimumPercentage: Number(minPercentage),
          maximumPercentage: Number(maxPercentage),
          gradePoint: Number(gradePoint),
          schoolId: user?.schoolId || undefined,
        };
        await createGradingScale(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
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
              <Sliders className="h-6 w-6 text-primary" />
              Grading Scales & GPA Tiers
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure institutional percentage ranges, letter grades, and grade point equivalents.
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
              Add Scale Tier
            </button>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-xs text-muted-foreground leading-relaxed">
        <strong>Institutional Evaluation Policy:</strong> Student scores are mapped against the configured grading scale in descending order of minimum percentage. If no custom scale is defined, the system applies the documented institutional default (A+ &gt;= 90%, A &gt;= 80%, B+ &gt;= 70%, B &gt;= 60%, C &gt;= 50%, D &gt;= 40%, F &lt; 40%).
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : scales.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No custom grading scale tiers configured. Default institutional scale active.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Letter Grade</th>
                <th className="py-3 px-4">Percentage Range</th>
                <th className="py-3 px-4 text-center">GPA Grade Point</th>
                <th className="py-3 px-4">Scheme Name</th>
                {isAuthorized && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scales.map((sc) => (
                <tr key={sc.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="rounded bg-muted px-2.5 py-1 text-xs font-extrabold text-foreground">
                      {sc.letterGrade}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-semibold text-foreground">
                    {sc.minimumPercentage}% — {sc.maximumPercentage}%
                  </td>

                  <td className="py-3 px-4 text-center font-bold text-primary">
                    {sc.gradePoint !== null && sc.gradePoint !== undefined ? sc.gradePoint.toFixed(2) : '—'}
                  </td>

                  <td className="py-3 px-4 text-muted-foreground">
                    {sc.name}
                  </td>

                  {isAuthorized && (
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(sc)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit Tier
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {editingId ? 'Edit Grading Tier' : 'Add Grading Scale Tier'}
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
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Scheme Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Letter Grade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A+"
                  value={letterGrade}
                  onChange={(e) => setLetterGrade(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Min Percentage (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    min={0}
                    max={100}
                    value={minPercentage}
                    onChange={(e) => setMinPercentage(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Max Percentage (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    min={0}
                    max={100}
                    value={maxPercentage}
                    onChange={(e) => setMaxPercentage(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  GPA Grade Point (Optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={5}
                  value={gradePoint}
                  onChange={(e) => setGradePoint(Number(e.target.value))}
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
                  {editingId ? 'Save Changes' : 'Create Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
