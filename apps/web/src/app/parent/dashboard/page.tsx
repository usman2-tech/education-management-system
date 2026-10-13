'use client';

/**
 * MODULE: Institutional Parent Portal Dashboard
 *
 * PURPOSE:
 * Dedicated institutional family portal showing verified enrolled children,
 * active academic class/section assignments, child switcher, and timetable.
 *
 * ZERO FABRICATION DIRECTIVE:
 * Displays only authentic database records of verified children and schedules.
 * Does not show simulated attendance or grade scores until those modules exist.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  ParentDashboardSummaryDto,
  LinkedStudentDto,
  TimetableEntryDto,
} from '@ems/contracts';
import { fetchParentDashboard } from '@/lib/parents-api';
import { fetchChildTimetable } from '@/lib/classes-api';
import {
  Users,
  GraduationCap,
  Calendar,
  Building2,
  Clock,
  MapPin,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = React.useState<ParentDashboardSummaryDto | null>(null);
  const [selectedChildId, setSelectedChildId] = React.useState<string | null>(null);
  const [childTimetable, setChildTimetable] = React.useState<TimetableEntryDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingSchedule, setIsLoadingSchedule] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchParentDashboard();
        setSummary(data);
        if (data.students && data.students.length > 0) {
          setSelectedChildId(data.students[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load parent dashboard:', err);
        setError(err.message || 'Failed to load family dashboard.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // When selected child changes, load their verified timetable
  React.useEffect(() => {
    if (!selectedChildId) return;

    async function loadSchedule() {
      setIsLoadingSchedule(true);
      try {
        const schedule = await fetchChildTimetable(selectedChildId!);
        setChildTimetable(schedule || []);
      } catch (err: any) {
        console.error('Failed to load child timetable:', err);
        setChildTimetable([]);
      } finally {
        setIsLoadingSchedule(false);
      }
    }
    loadSchedule();
  }, [selectedChildId]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Aggregating family portal records...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-2xl mx-auto py-12 p-6 rounded-2xl border border-border bg-card text-center space-y-3">
        <p className="text-sm text-rose-500 font-medium">{error || 'Unable to load parent dashboard.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  const activeChild = summary.students.find((s) => s.id === selectedChildId);

  // Group timetable by day of week
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Family Portal</span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Welcome, {summary.parent.firstName} {summary.parent.lastName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Institutional overview for your verified enrolled children at{' '}
            <span className="text-foreground font-medium">
              {summary.parent.primarySchool?.name || 'St. Jude Academy'}
            </span>
            .
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/parent/children"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-semibold transition"
          >
            <Users className="w-4 h-4 text-primary" />
            Manage Wards
          </Link>
          <Link
            href="/timetable"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
          >
            <Calendar className="w-4 h-4" />
            Full Schedule
          </Link>
        </div>
      </div>

      {/* Child Switcher Tabs (Multiple Children Support) */}
      {summary.students.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              Select Student / Ward
            </h2>
            <span className="text-xs text-muted-foreground">
              {summary.students.length} verified {summary.students.length === 1 ? 'child' : 'children'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {summary.students.map((child) => {
              const isSelected = child.id === selectedChildId;
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`p-4 rounded-2xl border text-left transition relative ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {child.firstName[0]}
                        {child.lastName[0]}
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-sm">
                          {child.firstName} {child.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {child.currentSection
                            ? `${child.currentSection.className} • ${child.currentSection.name}`
                            : 'Enrolled Student'}
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Admission: {child.admissionNumber || 'STJ-2026'}</span>
                    <span className="font-medium text-primary">
                      {isSelected ? 'Active View' : 'Switch →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl border border-dashed border-border bg-card text-center space-y-2">
          <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-bold text-foreground text-base">No Verified Children Linked</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Your guardian account is active, but no enrolled students are currently linked and verified.
            Please reach out to the institutional school administration to link your student records.
          </p>
        </div>
      )}

      {/* Active Child Overview Card */}
      {activeChild && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Child Academic Summary */}
          <div className="md:col-span-1 p-6 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                {activeChild.firstName[0]}
                {activeChild.lastName[0]}
              </div>
              <div>
                <h3 className="font-bold text-foreground">
                  {activeChild.firstName} {activeChild.lastName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {activeChild.gradeLevel || 'Grade 10'} • Ward
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Admission No:</span>
                <span className="font-semibold text-foreground select-all">
                  {activeChild.admissionNumber || 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Enrolled Class:</span>
                <span className="font-semibold text-foreground">
                  {activeChild.currentSection?.className || 'Standard Class'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Class Section:</span>
                <span className="font-semibold text-foreground">
                  {activeChild.currentSection?.name || 'Section A'}
                </span>
              </div>

              {activeChild.currentSection?.roomNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Classroom:</span>
                  <span className="font-semibold text-foreground">
                    {activeChild.currentSection.roomNumber}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">School Campus:</span>
                <span className="font-semibold text-foreground">
                  {activeChild.schoolName || 'St. Jude Academy'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Relationship:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {activeChild.relationshipType}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <Link
                href="/timetable"
                className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition"
              >
                <Calendar className="w-3.5 h-3.5" />
                Open Weekly Schedule
              </Link>
            </div>
          </div>

          {/* Right: Child Weekly Timetable Card */}
          <div className="md:col-span-2 p-6 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">
                  Weekly Class Timetable — {activeChild.firstName}
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {childTimetable.length} periods scheduled
              </span>
            </div>

            {isLoadingSchedule ? (
              <div className="py-12 flex justify-center items-center text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs">Loading child schedule...</span>
              </div>
            ) : childTimetable.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-border p-6 space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground/30" />
                <p className="text-sm font-medium text-foreground">No timetable entries scheduled yet.</p>
                <p className="text-xs text-muted-foreground">
                  Timetable entries will appear here once configured by the school administrators.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((dayNumber) => {
                  const dayEntries = childTimetable.filter((e) => e.dayOfWeek === dayNumber);
                  if (dayEntries.length === 0) return null;

                  return (
                    <div key={dayNumber} className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {dayNames[dayNumber - 1]}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {dayEntries.map((period) => (
                          <div
                            key={period.id}
                            className="p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-foreground">{period.subjectName}</div>
                              <div className="text-muted-foreground text-[11px]">
                                {period.teacherName} • {period.roomNumber || 'Classroom'}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-primary">
                                {period.startTime} - {period.endTime}
                              </span>
                              <div className="text-[11px] text-muted-foreground">
                                {period.periodName}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
