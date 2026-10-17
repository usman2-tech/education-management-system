'use client';

/**
 * MODULE: Class Detail, Section Roster & Teacher Assignments
 *
 * PURPOSE:
 * Enables managing classroom sections, enrolling students, assigning roll numbers,
 * and allocating faculty members to subjects for this specific class.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  SchoolClassDto,
  ClassSectionDto,
  ClassEnrollmentDto,
  TeacherSubjectAssignmentDto,
  AcademicYearDto,
  SubjectDto,
  TeacherDto,
  UserRole,
} from '@ems/contracts';
import {
  fetchClassById,
  createSection,
  fetchSectionEnrollments,
  enrollStudent,
  removeStudentEnrollment,
  fetchSectionTeacherAssignments,
  assignTeacherToSubject,
  fetchAcademicYears,
  fetchSubjects,
} from '@/lib/classes-api';
import { fetchTeachers } from '@/lib/teachers-api';
import {
  BookOpen,
  ArrowLeft,
  Plus,
  Users,
  GraduationCap,
  Layers,
  Calendar,
  Building2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

export default function ClassDetailPage() {
  const params = useParams();
  const classId = params?.id as string;
  const { effectiveRole } = useAuth();
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const [schoolClass, setSchoolClass] = React.useState<
    (SchoolClassDto & { sections: ClassSectionDto[] }) | null
  >(null);
  const [selectedSectionId, setSelectedSectionId] = React.useState<string | null>(null);
  const [enrollments, setEnrollments] = React.useState<ClassEnrollmentDto[]>([]);
  const [teacherAssignments, setTeacherAssignments] = React.useState<
    TeacherSubjectAssignmentDto[]
  >([]);
  const [academicYears, setAcademicYears] = React.useState<AcademicYearDto[]>([]);
  const [subjects, setSubjects] = React.useState<SubjectDto[]>([]);
  const [teachers, setTeachers] = React.useState<TeacherDto[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Add Section Modal
  const [isAddSectionOpen, setIsAddSectionOpen] = React.useState(false);
  const [sectionName, setSectionName] = React.useState('Section A');
  const [academicYearId, setAcademicYearId] = React.useState('');
  const [capacity, setCapacity] = React.useState(30);
  const [roomNumber, setRoomNumber] = React.useState('Room 101');
  const [isSubmittingSection, setIsSubmittingSection] = React.useState(false);

  // Enroll Student Modal
  const [isEnrollOpen, setIsEnrollOpen] = React.useState(false);
  const [studentId, setStudentId] = React.useState('');
  const [rollNumber, setRollNumber] = React.useState('');
  const [isSubmittingEnroll, setIsSubmittingEnroll] = React.useState(false);
  const [enrollError, setEnrollError] = React.useState<string | null>(null);

  // Assign Teacher Modal
  const [isAssignOpen, setIsAssignOpen] = React.useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = React.useState('');
  const [selectedSubjectId, setSelectedSubjectId] = React.useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = React.useState(false);
  const [assignError, setAssignError] = React.useState<string | null>(null);

  const loadClass = React.useCallback(async () => {
    if (!classId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [classData, yearsData, subjectsData, teachersData] = await Promise.all([
        fetchClassById(classId),
        fetchAcademicYears(),
        fetchSubjects(),
        fetchTeachers({ limit: 100 }),
      ]);

      setSchoolClass(classData);
      setAcademicYears(yearsData || []);
      setSubjects(subjectsData || []);
      setTeachers(teachersData?.items || []);

      if (yearsData && yearsData.length > 0) {
        const currentYear = yearsData.find((y) => y.isCurrent) || yearsData[0];
        setAcademicYearId(currentYear.id);
      }

      if (classData.sections && classData.sections.length > 0) {
        setSelectedSectionId((prev) => prev || classData.sections[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load class details.');
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  React.useEffect(() => {
    loadClass();
  }, [loadClass]);

  // Load section enrollments and teacher assignments whenever selectedSectionId changes
  const loadSectionDetails = React.useCallback(async () => {
    if (!selectedSectionId) return;
    try {
      const [enrData, assignData] = await Promise.all([
        fetchSectionEnrollments(selectedSectionId),
        fetchSectionTeacherAssignments(selectedSectionId),
      ]);
      setEnrollments(enrData || []);
      setTeacherAssignments(assignData || []);
    } catch (err: any) {
      console.error('Failed to load section details:', err);
    }
  }, [selectedSectionId]);

  React.useEffect(() => {
    loadSectionDetails();
  }, [loadSectionDetails]);

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionName.trim() || !academicYearId) return;

    setIsSubmittingSection(true);
    try {
      const created = await createSection({
        classId,
        academicYearId,
        name: sectionName.trim(),
        capacity: Number(capacity) || 30,
        roomNumber: roomNumber.trim() || undefined,
      });

      setIsAddSectionOpen(false);
      await loadClass();
      setSelectedSectionId(created.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create section.');
    } finally {
      setIsSubmittingSection(false);
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId || !studentId.trim()) return;

    setIsSubmittingEnroll(true);
    setEnrollError(null);
    try {
      await enrollStudent(selectedSectionId, {
        studentId: studentId.trim(),
        rollNumber: rollNumber.trim() || undefined,
      });

      setIsEnrollOpen(false);
      setStudentId('');
      setRollNumber('');
      await loadSectionDetails();
      await loadClass();
    } catch (err: any) {
      setEnrollError(err.message || 'Failed to enroll student.');
    } finally {
      setIsSubmittingEnroll(false);
    }
  };

  const handleWithdrawStudent = async (targetStudentId: string) => {
    if (!selectedSectionId) return;
    if (!confirm('Are you sure you want to withdraw this student from the section?')) return;

    try {
      await removeStudentEnrollment(selectedSectionId, targetStudentId);
      await loadSectionDetails();
      await loadClass();
    } catch (err: any) {
      alert(err.message || 'Failed to withdraw student.');
    }
  };

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId || !selectedTeacherId || !selectedSubjectId) return;

    setIsSubmittingAssign(true);
    setAssignError(null);
    try {
      await assignTeacherToSubject(selectedSectionId, {
        teacherId: selectedTeacherId,
        subjectId: selectedSubjectId,
      });

      setIsAssignOpen(false);
      await loadSectionDetails();
    } catch (err: any) {
      setAssignError(err.message || 'Failed to assign teacher.');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center items-center text-muted-foreground gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span>Loading class structure...</span>
      </div>
    );
  }

  if (error || !schoolClass) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm">
          {error || 'Class not found.'}
        </div>
        <Link href="/classes" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Classes Overview
        </Link>
      </div>
    );
  }

  const activeSection = schoolClass.sections.find((s) => s.id === selectedSectionId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/classes"
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {schoolClass.name}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-md font-mono font-semibold bg-muted text-muted-foreground border border-border">
                {schoolClass.code}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {schoolClass.description || 'Secondary curriculum tier and section administration.'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddSectionOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shadow-sm text-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        )}
      </div>

      {/* Sections Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
        {schoolClass.sections.map((sec) => {
          const isSelected = sec.id === selectedSectionId;
          return (
            <button
              key={sec.id}
              onClick={() => setSelectedSectionId(sec.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>{sec.name}</span>
              <span className="text-[11px] opacity-80 font-normal">
                ({sec.enrolledStudentsCount}/{sec.capacity})
              </span>
            </button>
          );
        })}
      </div>

      {activeSection ? (
        <div className="space-y-6">
          {/* Section Info Banner */}
          <div className="p-4 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-muted-foreground">Classroom:</span>{' '}
                <span className="font-semibold text-foreground">
                  {activeSection.roomNumber || 'Not assigned'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Capacity:</span>{' '}
                <span className="font-semibold text-foreground">
                  {activeSection.enrolledStudentsCount} / {activeSection.capacity} Seats Filled
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Class Teacher:</span>{' '}
                <span className="font-semibold text-foreground">
                  {activeSection.classTeacher
                    ? `${activeSection.classTeacher.firstName} ${activeSection.classTeacher.lastName}`
                    : 'Unassigned'}
                </span>
              </div>
            </div>

            <Link
              href="/timetable"
              className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline"
            >
              <Calendar className="w-3.5 h-3.5" />
              View Section Timetable →
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Enrolled Students Roster */}
            <div className="lg:col-span-2 p-6 rounded-2xl border border-border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">Enrolled Students Roster</h3>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setIsEnrollOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Enroll Student
                  </button>
                )}
              </div>

              {enrollments.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-border p-6 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground/30" />
                  <p className="text-sm font-medium text-foreground">No students enrolled in this section.</p>
                  <p className="text-xs text-muted-foreground">
                    Click &quot;Enroll Student&quot; to register a student and assign their roll number.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="px-3.5 py-2.5">Roll No</th>
                        <th className="px-3.5 py-2.5">Student Name</th>
                        <th className="px-3.5 py-2.5">Email</th>
                        <th className="px-3.5 py-2.5">Status</th>
                        {isAdmin && <th className="px-3.5 py-2.5 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {enrollments.map((enr) => (
                        <tr key={enr.id} className="hover:bg-muted/20">
                          <td className="px-3.5 py-3 font-mono font-semibold text-foreground">
                            {enr.rollNumber || '—'}
                          </td>
                          <td className="px-3.5 py-3 font-medium text-foreground">
                            {enr.student.firstName} {enr.student.lastName}
                          </td>
                          <td className="px-3.5 py-3 text-muted-foreground">{enr.student.email}</td>
                          <td className="px-3.5 py-3">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-3.5 py-3 text-right">
                              <button
                                onClick={() => handleWithdrawStudent(enr.studentId)}
                                className="p-1 text-muted-foreground hover:text-rose-600 transition"
                                title="Withdraw from section"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Col: Teacher Subject Assignments */}
            <div className="lg:col-span-1 p-6 rounded-2xl border border-border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-foreground">Faculty Allocation</h3>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setIsAssignOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Assign
                  </button>
                )}
              </div>

              {teacherAssignments.length === 0 ? (
                <div className="py-8 text-center rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground space-y-1">
                  <p>No faculty members assigned to subjects in this section yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {teacherAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl border border-border bg-muted/20 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{a.subjectName}</span>
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {a.subjectCode}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {a.teacher.firstName} {a.teacher.lastName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card p-6 space-y-2">
          <Layers className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-bold text-foreground text-base">No Sections Configured</h3>
          <p className="text-xs text-muted-foreground">
            Create a section for this class (e.g. Section A) to enroll students.
          </p>
        </div>
      )}

      {/* Add Section Modal */}
      {isAddSectionOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-base">New Class Section</h3>
              <button onClick={() => setIsAddSectionOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateSection} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Section Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Section A"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Academic Year
                </label>
                <select
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">
                    Student Capacity
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground uppercase mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddSectionOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSection}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  {isSubmittingSection ? 'Creating...' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Student Modal */}
      {isEnrollOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-base">Enroll Student</h3>
              <button onClick={() => setIsEnrollOpen(false)}>✕</button>
            </div>

            {enrollError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs">
                {enrollError}
              </div>
            )}

            <form onSubmit={handleEnrollStudent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Student User ID / UUID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Paste student UUID or email"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10A-01"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEnrollOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEnroll}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  {isSubmittingEnroll ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-base">Assign Faculty to Subject</h3>
              <button onClick={() => setIsAssignOpen(false)}>✕</button>
            </div>

            {assignError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignTeacher} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground uppercase mb-1">
                  Subject
                </label>
                <select
                  required
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
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
                  Teacher
                </label>
                <select
                  required
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
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

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssign}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  {isSubmittingAssign ? 'Assigning...' : 'Assign Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
