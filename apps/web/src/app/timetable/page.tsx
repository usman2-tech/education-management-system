'use client';

/**
 * MODULE: Institutional Timetable Management & Schedules
 *
 * PURPOSE:
 * Interactive weekly schedule grid supporting:
 * - Master section schedule view (for School Administrators)
 * - Faculty individual schedule view (for Teachers)
 * - Student enrolled class schedule view (for Students)
 * - Parent-visible child schedule view with multiple child switcher (for Parents)
 * - Live scheduling conflict detection (Teacher, Section, Room booking overlaps)
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  TimetableEntryDto,
  ClassSectionDto,
  SubjectDto,
  TeacherDto,
  AcademicYearDto,
  UserRole,
} from '@ems/contracts';
import {
  fetchSectionTimetable,
  fetchTeacherTimetable,
  fetchStudentTimetable,
  fetchChildTimetable,
  createTimetableEntry,
  deleteTimetableEntry,
  fetchSections,
  fetchSubjects,
  fetchAcademicYears,
} from '@/lib/classes-api';
import { fetchTeachers } from '@/lib/teachers-api';
import { fetchParentDashboard } from '@/lib/parents-api';
import {
  Clock,
  Plus,
  Calendar,
  Building2,
  Trash2,
  Loader2,
  AlertCircle,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
];

export default function TimetablePage() {
  const { user, effectiveRole } = useAuth();
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;
  const isTeacher = effectiveRole === UserRole.TEACHER;
  const isStudent = effectiveRole === UserRole.STUDENT;
  const isParent = effectiveRole === UserRole.PARENT;

  // Admin section selector state
  const [sections, setSections] = React.useState<ClassSectionDto[]>([]);
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('');
  const [academicYears, setAcademicYears] = React.useState<AcademicYearDto[]>([]);
  const [subjects, setSubjects] = React.useState<SubjectDto[]>([]);
  const [teachers, setTeachers] = React.useState<TeacherDto[]>([]);

  // Parent child selector state
  const [parentChildren, setParentChildren] = React.useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = React.useState<string>('');

  // Timetable entries
  const [entries, setEntries] = React.useState<TimetableEntryDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Add Entry Modal State
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [modalDay, setModalDay] = React.useState<number>(1);
  const [modalPeriod, setModalPeriod] = React.useState<string>('Period 1');
  const [modalStart, setModalStart] = React.useState<string>('08:30');
  const [modalEnd, setModalEnd] = React.useState<string>('09:20');
  const [modalSubjectId, setModalSubjectId] = React.useState<string>('');
  const [modalTeacherId, setModalTeacherId] = React.useState<string>('');
  const [modalRoom, setModalRoom] = React.useState<string>('Room 101');
  const [isSubmittingEntry, setIsSubmittingEntry] = React.useState(false);
  const [conflictError, setConflictError] = React.useState<string | null>(null);

  // Initialize role-based data
  React.useEffect(() => {
    async function init() {
      setIsLoading(true);
      setError(null);
      try {
        if (isAdmin) {
          const [secData, yearsData, subsData, tchData] = await Promise.all([
            fetchSections(),
            fetchAcademicYears(),
            fetchSubjects(),
            fetchTeachers({ limit: 100 }),
          ]);

          setSections(secData || []);
          setAcademicYears(yearsData || []);
          setSubjects(subsData || []);
          setTeachers(tchData?.items || []);

          if (secData && secData.length > 0) {
            setSelectedSectionId(secData[0].id);
          }
        } else if (isParent) {
          const dash = await fetchParentDashboard();
          setParentChildren(dash.students || []);
          if (dash.students && dash.students.length > 0) {
            setSelectedChildId(dash.students[0].id);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize timetable view.');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [isAdmin, isParent]);

  // Load timetable entries based on current role and selection
  const loadTimetable = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: TimetableEntryDto[] = [];

      if (isAdmin) {
        if (selectedSectionId) {
          data = await fetchSectionTimetable(selectedSectionId);
        }
      } else if (isTeacher && user?.id) {
        data = await fetchTeacherTimetable(user.id);
      } else if (isStudent && user?.id) {
        data = await fetchStudentTimetable(user.id);
      } else if (isParent) {
        if (selectedChildId) {
          data = await fetchChildTimetable(selectedChildId);
        }
      }

      setEntries(data || []);
    } catch (err: any) {
      console.error('Failed to load timetable:', err);
      setError(err.message || 'Failed to load timetable schedule.');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, isTeacher, isStudent, isParent, user?.id, selectedSectionId, selectedChildId]);

  React.useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId || !modalSubjectId || !modalTeacherId) return;

    const activeSec = sections.find((s) => s.id === selectedSectionId);
    if (!activeSec) return;

    setIsSubmittingEntry(true);
    setConflictError(null);
    try {
      await createTimetableEntry({
        sectionId: selectedSectionId,
        subjectId: modalSubjectId,
        teacherId: modalTeacherId,
        academicYearId: activeSec.academicYearId,
        dayOfWeek: Number(modalDay),
        periodName: modalPeriod.trim(),
        startTime: modalStart.trim(),
        endTime: modalEnd.trim(),
        roomNumber: modalRoom.trim() || undefined,
      });

      setIsAddModalOpen(false);
      await loadTimetable();
    } catch (err: any) {
      console.error('Conflict error:', err);
      // Capture and display scheduling conflict message from API
      setConflictError(err.message || 'Timetable scheduling conflict detected.');
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timetable entry?')) return;
    try {
      await deleteTimetableEntry(id);
      await loadTimetable();
    } catch (err: any) {
      alert(err.message || 'Failed to remove entry.');
    }
  };

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Weekly Timetable Schedules
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin && 'Master institutional weekly schedule grid and conflict management.'}
              {isTeacher && 'Personal instructional schedule across assigned classes and lecture rooms.'}
              {isStudent && 'Classroom lecture schedule and room allocations.'}
              {isParent && 'Verified weekly timetable for your enrolled children.'}
            </p>
          </div>
        </div>

        {isAdmin && selectedSectionId && (
          <button
            onClick={() => {
              setConflictError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shadow-sm text-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Schedule Entry
          </button>
        )}
      </div>

      {/* Role-Specific Controls & Selectors */}
      {isAdmin && (
        <div className="p-4 rounded-2xl border border-border bg-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Class Section:
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-background border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.className} — {sec.name} ({sec.enrolledStudentsCount} students)
                </option>
              ))}
            </select>
          </div>

          {selectedSection && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Term: <strong className="text-foreground">{selectedSection.academicYearName}</strong></span>
              <span>Room: <strong className="text-foreground">{selectedSection.roomNumber || 'N/A'}</strong></span>
            </div>
          )}
        </div>
      )}

      {isParent && (
        <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Select Child / Ward:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {parentChildren.map((child) => {
              const isSelected = child.id === selectedChildId;
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>
                    {child.firstName} {child.lastName}
                  </span>
                  <span className="text-[11px] opacity-80">
                    ({child.currentSection?.className || 'Grade 10'})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Master 5-Day Weekly Grid */}
      {isLoading ? (
        <div className="py-24 flex justify-center items-center text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Loading weekly schedule grid...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayEntries = entries
              .filter((e) => e.dayOfWeek === day.id)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div
                key={day.id}
                className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col shadow-sm"
              >
                {/* Day Header */}
                <div className="p-3.5 bg-muted/30 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold text-foreground text-sm">{day.name}</h3>
                  <span className="text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-background border border-border">
                    {dayEntries.length} {dayEntries.length === 1 ? 'Period' : 'Periods'}
                  </span>
                </div>

                {/* Day Entries List */}
                <div className="p-3 flex-1 space-y-2.5">
                  {dayEntries.length === 0 ? (
                    <div className="py-10 text-center text-xs text-muted-foreground/60 italic">
                      No classes scheduled
                    </div>
                  ) : (
                    dayEntries.map((period) => (
                      <div
                        key={period.id}
                        className="p-3 rounded-xl border border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40 transition text-xs space-y-2 relative group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-foreground text-sm leading-tight">
                            {period.subjectName}
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteEntry(period.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-600 transition"
                              title="Delete timetable entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-primary font-semibold text-[11px]">
                          <Clock className="w-3 h-3" />
                          <span>
                            {period.startTime} - {period.endTime}
                          </span>
                          <span className="text-muted-foreground font-normal">
                            ({period.periodName})
                          </span>
                        </div>

                        <div className="pt-1.5 border-t border-border/50 space-y-0.5 text-[11px] text-muted-foreground">
                          <div className="font-medium text-foreground truncate">
                            {period.teacherName}
                          </div>
                          <div>Room: {period.roomNumber || 'Not specified'}</div>
                          {period.className && (
                            <div className="text-[10px] text-indigo-500 font-semibold truncate">
                              {period.className} • {period.sectionName}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Timetable Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground text-base">Schedule Timetable Period</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Conflict Error Message Display */}
            {conflictError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold">Scheduling Conflict Blocked:</div>
                  <div>{conflictError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateEntry} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">
                    Day of Week
                  </label>
                  <select
                    value={modalDay}
                    onChange={(e) => setModalDay(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm font-medium"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">
                    Period Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Period 1"
                    value={modalPeriod}
                    onChange={(e) => setModalPeriod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">
                    Start Time (HH:mm)
                  </label>
                  <input
                    type="time"
                    required
                    value={modalStart}
                    onChange={(e) => setModalStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">
                    End Time (HH:mm)
                  </label>
                  <input
                    type="time"
                    required
                    value={modalEnd}
                    onChange={(e) => setModalEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Curriculum Subject
                </label>
                <select
                  required
                  value={modalSubjectId}
                  onChange={(e) => setModalSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                >
                  <option value="">Select subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Assigned Teacher
                </label>
                <select
                  required
                  value={modalTeacherId}
                  onChange={(e) => setModalTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                >
                  <option value="">Select teacher...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Classroom / Lecture Hall
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 101"
                  value={modalRoom}
                  onChange={(e) => setModalRoom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEntry}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
                >
                  {isSubmittingEntry ? 'Validating Conflicts...' : 'Save Schedule Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
