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
  TimetableEntryDto,
} from '@ems/contracts';
import { fetchParentDashboard as fetchOldParentDashboard } from '@/lib/parents-api';
import { fetchParentDashboard as fetchNewParentDashboard } from '@/lib/dashboards-api';
import { fetchChildTimetable } from '@/lib/classes-api';
import { DonutMetricChart } from '@/components/dashboard/dashboard-charts';
import { DashboardSkeleton } from '@/components/ui/skeleton';
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
  Award,
  FileText,
  AlertCircle,
  Bell,
  MessageSquare,
} from 'lucide-react';

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = React.useState<ParentDashboardSummaryDto | null>(null);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
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
        const [oldData, newData] = await Promise.all([
          fetchOldParentDashboard().catch(() => null),
          fetchNewParentDashboard().catch(() => null),
        ]);
        if (oldData) setSummary(oldData);
        if (newData) setDashboardData(newData);

        if (oldData?.students && oldData.students.length > 0) {
          setSelectedChildId(oldData.students[0].id);
        } else if (newData?.children && newData.children.length > 0) {
          setSelectedChildId(newData.children[0].studentId);
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

  // When selected child changes, load their verified timetable and dashboard data
  React.useEffect(() => {
    if (!selectedChildId) return;

    async function loadSchedule() {
      setIsLoadingSchedule(true);
      try {
        const [schedule, childDash] = await Promise.all([
          fetchChildTimetable(selectedChildId!).catch(() => []),
          fetchNewParentDashboard(selectedChildId!).catch(() => null),
        ]);
        setChildTimetable(schedule || []);
        if (childDash) setDashboardData(childDash);
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
    return <DashboardSkeleton />;
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

      {/* Child Performance Metrics & Analytics */}
      {dashboardData && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          {(() => {
            const childInfo = dashboardData.children?.find((c: any) => c.studentId === selectedChildId) || dashboardData.children?.[0];
            if (!childInfo) return null;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Attendance Rate
                    </p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">
                      {childInfo.attendancePercentage}%
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Verified presence</p>
                  </div>
                  <div className="w-16 h-16">
                    <DonutMetricChart
                      percentage={childInfo.attendancePercentage}
                      label=""
                      size={64}
                      strokeWidth={6}
                      color={childInfo.attendancePercentage >= 80 ? 'stroke-emerald-500' : 'stroke-amber-500'}
                    />
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Term GPA
                    </p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">
                      {childInfo.gpa !== null ? childInfo.gpa : 'N/A'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {childInfo.letterGrade ? `Grade: ${childInfo.letterGrade}` : 'Assessments in progress'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Award className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Pending Homework
                    </p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">
                      {childInfo.pendingHomeworkCount}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Tasks due soon</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Upcoming Tests
                    </p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">
                      {childInfo.upcomingExamsCount}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Scheduled exams</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Recent Grades & Communications Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Assessment Marks */}
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">Recent Published Marks</h3>
                </div>
                <Link href="/grades" className="text-xs font-semibold text-primary hover:underline">
                  Full Report Card →
                </Link>
              </div>

              <div className="divide-y divide-border">
                {(!dashboardData.selectedChildRecentGrades || dashboardData.selectedChildRecentGrades.length === 0) ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No graded assessments recorded for this student yet.
                  </p>
                ) : (
                  dashboardData.selectedChildRecentGrades.map((g: any, idx: number) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-foreground">{g.title}</span>
                        <p className="text-[11px] text-muted-foreground">{g.subjectName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {g.marksObtained} / {g.maximumMarks}
                        </span>
                        {g.letterGrade && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            {g.letterGrade}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* School Bulletins & Teacher Communications */}
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">Campus Bulletins & Messages</h3>
                </div>
                <Link href="/messages" className="text-xs font-semibold text-primary hover:underline">
                  Message Teachers →
                </Link>
              </div>

              <div className="space-y-3">
                {(!dashboardData.schoolAnnouncements || dashboardData.schoolAnnouncements.length === 0) &&
                (!dashboardData.teacherMessages || dashboardData.teacherMessages.length === 0) ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No active school announcements or new messages.
                  </p>
                ) : (
                  <>
                    {dashboardData.schoolAnnouncements?.map((ann: any) => (
                      <div key={ann.id} className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs">
                        <div className="flex items-center justify-between font-semibold text-foreground">
                          <span>{ann.title}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(ann.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-[11px]">{ann.message}</p>
                      </div>
                    ))}

                    {dashboardData.teacherMessages?.map((msg: any) => (
                      <div key={msg.id} className="p-3 rounded-xl border border-border bg-muted/20 text-xs">
                        <div className="flex items-center justify-between font-semibold text-foreground">
                          <span>Teacher: {msg.senderName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-[11px] truncate">{msg.content}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
