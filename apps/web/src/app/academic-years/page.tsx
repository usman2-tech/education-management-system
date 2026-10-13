'use client';

/**
 * MODULE: Institutional Academic Years Management
 *
 * PURPOSE:
 * Academic calendar management: configuring annual terms, start/end dates,
 * and current academic year activation.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { AcademicYearDto, UserRole } from '@ems/contracts';
import { fetchAcademicYears, createAcademicYear, updateAcademicYear } from '@/lib/classes-api';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Building2,
  Check,
} from 'lucide-react';

export default function AcademicYearsPage() {
  const { effectiveRole } = useAuth();
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const [years, setYears] = React.useState<AcademicYearDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [name, setName] = React.useState('2026-2027 Academic Year');
  const [startDate, setStartDate] = React.useState('2026-09-01');
  const [endDate, setEndDate] = React.useState('2027-06-30');
  const [isCurrent, setIsCurrent] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const loadYears = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAcademicYears();
      setYears(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load academic years.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadYears();
  }, [loadYears]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) {
      setFormError('Please fill out all mandatory fields.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await createAcademicYear({
        name: name.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        isCurrent,
      });

      setIsModalOpen(false);
      setName('');
      await loadYears();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create academic year.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetCurrent = async (year: AcademicYearDto) => {
    try {
      await updateAcademicYear(year.id, { isCurrent: true });
      await loadYears();
    } catch (err: any) {
      alert(err.message || 'Failed to update current academic year.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Academic Years</h1>
            <p className="text-sm text-muted-foreground">
              Configure institutional calendar years, academic cycles, and term dates.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Academic Year
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
          <span>Loading academic calendar...</span>
        </div>
      ) : years.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card p-6 space-y-2">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-bold text-foreground text-base">No Academic Years Defined</h3>
          <p className="text-xs text-muted-foreground">
            Create an academic year to start configuring class sections and timetable schedules.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {years.map((year) => (
            <div
              key={year.id}
              className={`p-6 rounded-2xl border bg-card space-y-4 transition ${
                year.isCurrent ? 'border-primary ring-1 ring-primary/30 shadow-sm' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-foreground text-lg">{year.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(year.startDate).toLocaleDateString()} -{' '}
                      {new Date(year.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {year.isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active Term
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    Archived
                  </span>
                )}
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>{year.sectionsCount || 0} Class Sections</span>
                {!year.isCurrent && isAdmin && (
                  <button
                    onClick={() => handleSetCurrent(year)}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Set as Current
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-base">New Academic Year</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Academic Year Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027 Academic Year"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCurrent}
                    onChange={(e) => setIsCurrent(e.target.checked)}
                    className="rounded border-border"
                  />
                  Set as Current Active Academic Year
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-border hover:bg-muted text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
                >
                  {isSubmitting ? 'Creating...' : 'Create Academic Year'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
