'use client';

/**
 * MODULE: Parent Portal — Children Overview
 *
 * PURPOSE:
 * Displays all verified children linked to the parent account with their
 * academic enrollments, class section details, and timetable links.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { ParentDashboardSummaryDto } from '@ems/contracts';
import { fetchParentDashboard } from '@/lib/parents-api';
import {
  Users,
  GraduationCap,
  Calendar,
  Building2,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Mail,
  BookOpen,
} from 'lucide-react';

export default function ParentChildrenPage() {
  const [summary, setSummary] = React.useState<ParentDashboardSummaryDto | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchParentDashboard();
        setSummary(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load children records.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Loading children records...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/parent/dashboard"
          className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Enrolled Children & Wards
          </h1>
          <p className="text-sm text-muted-foreground">
            Academic enrollment details and timetable schedules for your verified students.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {summary && summary.students.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card p-6 space-y-2">
          <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-bold text-foreground text-base">No Verified Children Found</h3>
          <p className="text-xs text-muted-foreground">
            Contact the school administration office to establish student linkage for your account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {summary?.students.map((child) => (
            <div
              key={child.id}
              className="p-6 rounded-2xl border border-border bg-card space-y-5 hover:border-primary/40 transition shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                    {child.firstName[0]}
                    {child.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base">
                      {child.firstName} {child.lastName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Admission: <span className="font-semibold text-foreground">{child.admissionNumber || 'N/A'}</span>
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-border text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Enrolled Class:</span>
                  <span className="font-semibold text-foreground">
                    {child.currentSection?.className || 'Grade 10'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Section:</span>
                  <span className="font-semibold text-foreground">
                    {child.currentSection?.name || 'Section A'}
                  </span>
                </div>
                {child.currentSection?.roomNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Classroom:</span>
                    <span className="font-semibold text-foreground">
                      {child.currentSection.roomNumber}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">School Campus:</span>
                  <span className="font-semibold text-foreground">
                    {child.schoolName || 'St. Jude Academy'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Relationship Type:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {child.relationshipType}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                <Link
                  href="/timetable"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
                >
                  <Calendar className="w-4 h-4" />
                  View Weekly Timetable
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
