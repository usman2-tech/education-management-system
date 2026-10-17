'use client';

/**
 * MODULE: Institutional Student Directory & Enrollment Management
 *
 * PURPOSE:
 * School-authorized student enrollment roster and management interface.
 * Implements TASK 018.1 requirements:
 * - RBAC permission enforcement: Platform & School Admins can enroll and edit; Teachers/Students/Parents cannot.
 * - Optional student photo upload with live preview, JPG/PNG/WebP format, and 2MB file size enforcement.
 * - Student photo editing, replacement, and removal.
 * - Display of student avatars in directory table and profile inspector.
 * - Controlled institutional invitation modal for students, parents, and faculty.
 *
 * SECURITY:
 * Strict school-level tenant scoping enforced on backend.
 */

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { UserRole } from '@ems/contracts';
import { feesApi } from '@/lib/fees-api';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  GraduationCap,
  Search,
  BookOpen,
  Clock,
  Award,
  MessageSquare,
  Loader2,
  Building2,
  ArrowRight,
  Filter,
  Plus,
  Camera,
  X,
  Upload,
  UserCheck,
  Edit2,
  Trash2,
  Eye,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Copy,
  Check,
  Receipt,
  DollarSign,
  CreditCard,
  Printer,
} from 'lucide-react';

interface StudentItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  admissionNumber?: string | null;
  gradeLevel?: string | null;
  section?: {
    id: string;
    name: string;
    className: string;
  } | null;
  createdAt: string;
}

interface ClassSectionItem {
  id: string;
  name: string;
  schoolClass?: {
    name: string;
  };
}

export default function StudentsDirectoryPage() {
  const { user, effectiveRole } = useAuth();
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [sections, setSections] = useState<ClassSectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Enrollment Modal state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isSubmittingEnroll, setIsSubmittingEnroll] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  // Enroll form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Grade 9');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Profile View Modal state
  const [viewStudent, setViewStudent] = useState<StudentItem | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'fees'>('overview');
  const [feesProfile, setFeesProfile] = useState<any | null>(null);
  const [isLoadingFeesProfile, setIsLoadingFeesProfile] = useState(false);
  const [feesProfileError, setFeesProfileError] = useState<string | null>(null);

  // Edit / Photo Modal state
  const [editStudent, setEditStudent] = useState<StudentItem | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editPhotoBase64, setEditPhotoBase64] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // Invite Modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.STUDENT);
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    message: string;
    devActivationLink?: string;
  } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadStudents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm.trim())}` : '';
      const data = await apiClient.get<any>(`/students${qs}`);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load students:', err);
      setError(err.message || 'Failed to load students.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSections = async () => {
    try {
      const data = await apiClient.get<any>('/classes/sections');
      setSections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not load sections:', err);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadStudentFees = async (studentId: string) => {
    setIsLoadingFeesProfile(true);
    setFeesProfileError(null);
    try {
      const data = await feesApi.getStudentFeeProfile(studentId);
      setFeesProfile(data);
    } catch (err: any) {
      setFeesProfileError(err.message || 'Failed to load student fee profile.');
    } finally {
      setIsLoadingFeesProfile(false);
    }
  };

  // Handle Photo Selection
  const handlePhotoSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (val: string | null) => void,
    setBase64: (val: string | null) => void,
    setErrorMsg: (val: string | null) => void
  ) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Invalid photo format. Only JPG, PNG, and WebP are allowed.');
      return;
    }

    // Validate size (2MB = 2 * 1024 * 1024 bytes)
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Photo file size exceeds 2 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      setBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError(null);
    setEnrollSuccess(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setEnrollError('First Name, Last Name, and Email are required.');
      return;
    }

    setIsSubmittingEnroll(true);
    try {
      await apiClient.post('/students', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        admissionNumber: admissionNumber.trim() || undefined,
        gradeLevel: gradeLevel.trim() || undefined,
        sectionId: selectedSectionId || undefined,
        photoBase64: photoBase64 || undefined,
      });

      setEnrollSuccess('Student enrolled successfully with institutional profile and credentials.');
      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setAdmissionNumber('');
      setPhotoPreview(null);
      setPhotoBase64(null);
      loadStudents();

      setTimeout(() => {
        setIsEnrollModalOpen(false);
        setEnrollSuccess(null);
      }, 1500);
    } catch (err: any) {
      setEnrollError(err.message || 'Failed to enroll student.');
    } finally {
      setIsSubmittingEnroll(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    setEditError(null);
    setIsSubmittingEdit(true);

    try {
      await apiClient.patch(`/students/${editStudent.id}`, {
        firstName: editStudent.firstName,
        lastName: editStudent.lastName,
        phone: editStudent.phone || undefined,
        admissionNumber: editStudent.admissionNumber || undefined,
        gradeLevel: editStudent.gradeLevel || undefined,
        photoBase64: editPhotoBase64,
        avatarUrl: editPhotoBase64 === null && editPhotoPreview === null ? null : undefined,
      });

      setEditStudent(null);
      setEditPhotoPreview(null);
      setEditPhotoBase64(null);
      loadStudents();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update student profile.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteResult(null);

    if (!inviteEmail.trim()) {
      setInviteError('Please provide an email address.');
      return;
    }

    setIsSubmittingInvite(true);
    try {
      const res = await apiClient.post<any>('/auth/invite', {
        email: inviteEmail.trim(),
        role: inviteRole,
        firstName: inviteFirstName.trim() || undefined,
        lastName: inviteLastName.trim() || undefined,
      });

      setInviteResult({
        message: res.message || 'Invitation created successfully.',
        devActivationLink: res.devActivationLink,
      });
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
    } catch (err: any) {
      setInviteError(err.message || 'Failed to issue invitation.');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              <GraduationCap className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Student Enrollment Directory
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Official institutional registry of enrolled students, class section assignments,
            and verified student photos.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Link
            href="/classes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Class Sections
          </Link>
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <Clock className="h-3.5 w-3.5 text-primary" />
            Attendance
          </Link>

          {/* Institutional Invitation Control */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setIsInviteModalOpen(true);
                setInviteResult(null);
                setInviteError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Invite User</span>
            </button>
          )}

          {/* Student Enrollment Control (School Admin & Platform Admin only) */}
          {isAdmin && (
            <button
              type="button"
              id="enroll-student-btn"
              onClick={() => {
                setIsEnrollModalOpen(true);
                setEnrollError(null);
                setEnrollSuccess(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Enroll Student</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student name, email, or admission number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0 font-medium">
          Showing {students.length} student{students.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center text-xs text-rose-600">
          {error}
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-sm font-semibold text-foreground">No Students Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No enrolled students match your query for this institutional school tenant.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Enroll First Student</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4 font-semibold">Student & Photo</th>
                <th className="py-3 px-4 font-semibold">Admission No</th>
                <th className="py-3 px-4 font-semibold">Class & Section</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      {student.avatarUrl ? (
                        <img
                          src={student.avatarUrl}
                          alt={`${student.firstName} ${student.lastName}`}
                          className="w-8 h-8 rounded-full object-cover border border-border/80 shadow-xs"
                          onError={(e) => {
                            // Fallback if image fails to stream
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px] border border-primary/20">
                          {student.firstName[0]}
                          {student.lastName[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-foreground">
                          {student.firstName} {student.lastName}
                        </div>
                        {student.gradeLevel && (
                          <div className="text-[10px] text-muted-foreground">
                            {student.gradeLevel}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-muted-foreground">
                    {student.admissionNumber || 'STU-2026'}
                  </td>
                  <td className="py-3 px-4">
                    {student.section ? (
                      <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                        {student.section.className} — {student.section.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-[11px]">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{student.email}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewStudent(student)}
                        title="View Full Student Profile"
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditStudent({ ...student });
                            setEditPhotoPreview(student.avatarUrl || null);
                            setEditPhotoBase64(null);
                            setEditError(null);
                          }}
                          title="Edit Student & Photo"
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}

                      <Link
                        href={`/grades/students/${student.id}`}
                        title="View Report Card"
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      >
                        <Award className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/attendance/students/${student.id}`}
                        title="Attendance Record"
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      >
                        <Clock className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* ENROLL STUDENT MODAL (WITH OPTIONAL PHOTO UPLOAD) */}
      {/* --------------------------------------------------------------------- */}
      {isEnrollModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Enroll New Student
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Institutional enrollment with optional verified student photo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {enrollError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{enrollError}</span>
              </div>
            )}

            {enrollSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{enrollSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEnrollSubmit} className="mt-5 space-y-4">
              {/* Photo Upload Section */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Student Photo (Optional &bull; JPG, PNG, WebP up to 2MB)
                </label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <div className="relative group">
                      <img
                        src={photoPreview}
                        alt="Selected preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-primary shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setPhotoBase64(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-xs hover:bg-destructive/90"
                        title="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-border bg-background flex items-center justify-center text-muted-foreground">
                      <Camera className="h-6 w-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) =>
                        handlePhotoSelect(
                          e,
                          setPhotoPreview,
                          setPhotoBase64,
                          setEnrollError
                        )
                      }
                      className="text-xs file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Images are securely stored and isolated to this school tenant.
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Liam"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Chen"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@institution.edu"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Academic Enrollment Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Admission Number
                  </label>
                  <input
                    type="text"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    placeholder="e.g. STU-2026-042"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Grade Level
                  </label>
                  <input
                    type="text"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="e.g. Grade 9"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Class Section
                  </label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">Select Section (Optional)</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.schoolClass?.name ? `${sec.schoolClass.name} — ` : ''}
                        {sec.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEnroll}
                  className="px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmittingEnroll ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Enrolling Student...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>Confirm Enrollment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* EDIT STUDENT & PHOTO MODAL */}
      {/* --------------------------------------------------------------------- */}
      {editStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Edit Student Profile & Photo
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Update enrollment details or replace/remove institutional photo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditStudent(null)}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              {/* Photo Management */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Student Photo Management
                </label>
                <div className="flex items-center gap-4">
                  {editPhotoPreview ? (
                    <div className="relative group">
                      <img
                        src={editPhotoPreview}
                        alt="Student"
                        className="w-16 h-16 rounded-full object-cover border-2 border-primary shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditPhotoPreview(null);
                          setEditPhotoBase64(null);
                          if (editFileInputRef.current) editFileInputRef.current.value = '';
                        }}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-xs hover:bg-destructive/90"
                        title="Remove current photo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-border bg-background flex items-center justify-center text-muted-foreground">
                      <Camera className="h-6 w-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) =>
                        handlePhotoSelect(
                          e,
                          setEditPhotoPreview,
                          setEditPhotoBase64,
                          setEditError
                        )
                      }
                      className="text-xs file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Upload a new photo to replace, or click trash to remove.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editStudent.firstName}
                    onChange={(e) =>
                      setEditStudent({ ...editStudent, firstName: e.target.value })
                    }
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editStudent.lastName}
                    onChange={(e) =>
                      setEditStudent({ ...editStudent, lastName: e.target.value })
                    }
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Admission Number
                  </label>
                  <input
                    type="text"
                    value={editStudent.admissionNumber || ''}
                    onChange={(e) =>
                      setEditStudent({ ...editStudent, admissionNumber: e.target.value })
                    }
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Grade Level
                  </label>
                  <input
                    type="text"
                    value={editStudent.gradeLevel || ''}
                    onChange={(e) =>
                      setEditStudent({ ...editStudent, gradeLevel: e.target.value })
                    }
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* VIEW STUDENT PROFILE MODAL */}
      {/* --------------------------------------------------------------------- */}
      {viewStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className={`relative w-full ${profileTab === 'fees' ? 'max-w-2xl' : 'max-w-md'} rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto`}>
            <button
              type="button"
              onClick={() => {
                setViewStudent(null);
                setProfileTab('overview');
              }}
              className="absolute top-4 right-4 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              {viewStudent.avatarUrl ? (
                <img
                  src={viewStudent.avatarUrl}
                  alt={`${viewStudent.firstName} ${viewStudent.lastName}`}
                  className="w-20 h-20 rounded-full object-cover border-4 border-primary/20 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center text-xl border-4 border-primary/20">
                  {viewStudent.firstName[0]}
                  {viewStudent.lastName[0]}
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-foreground">
                  {viewStudent.firstName} {viewStudent.lastName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {viewStudent.admissionNumber || 'STU-2026'} &bull;{' '}
                  {viewStudent.gradeLevel || 'Enrolled Student'}
                </p>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border mt-2">
                <button
                  type="button"
                  onClick={() => setProfileTab('overview')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    profileTab === 'overview'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileTab('fees');
                    if (viewStudent && !feesProfile) {
                      loadStudentFees(viewStudent.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    profileTab === 'fees'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <DollarSign className="h-3 w-3" />
                  <span>Fees & Finances</span>
                </button>
              </div>
            </div>

            {profileTab === 'overview' ? (
              <div className="mt-5 space-y-2.5 rounded-xl border border-border bg-muted/30 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Class & Section:</span>
                  <span className="font-semibold text-foreground">
                    {viewStudent.section
                      ? `${viewStudent.section.className} — ${viewStudent.section.name}`
                      : 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-semibold text-foreground">{viewStudent.email}</span>
                </div>
                {viewStudent.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-semibold text-foreground">{viewStudent.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Enrolled Since:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(viewStudent.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {effectiveRole === UserRole.TEACHER ? (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>
                      Access Restricted: Educators and faculty members do not possess permissions to view confidential student financial records.
                    </span>
                  </div>
                ) : isLoadingFeesProfile ? (
                  <div className="p-8 text-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    <p className="text-xs text-muted-foreground">Loading fee records...</p>
                  </div>
                ) : feesProfileError ? (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
                    {feesProfileError}
                  </div>
                ) : feesProfile ? (
                  <div className="space-y-4 text-xs">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="rounded-xl border border-border bg-muted/30 p-2.5 text-center">
                        <span className="text-[10px] text-muted-foreground">Billed</span>
                        <div className="font-bold text-foreground">
                          ${feesProfile.summary.totalBilled.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-2.5 text-center">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Paid</span>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          ${feesProfile.summary.totalPaid.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-2.5 text-center">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">Balance</span>
                        <div className="font-bold text-amber-600 dark:text-amber-400">
                          ${feesProfile.summary.outstandingBalance.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-2.5 text-center">
                        <span className="text-[10px] text-rose-600 dark:text-rose-400">Overdue</span>
                        <div className="font-bold text-rose-600 dark:text-rose-400">
                          ${feesProfile.summary.overdueBalance.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Invoices */}
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="p-2.5 bg-muted/40 font-semibold text-foreground text-[11px] flex justify-between items-center">
                        <span>Issued Invoices ({feesProfile.invoices.length})</span>
                        <Link
                          href="/fees"
                          className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>Fee Ledger</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                        </Link>
                      </div>
                      {feesProfile.invoices.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-[11px]">
                          No invoices issued for this student.
                        </div>
                      ) : (
                        <div className="max-h-36 overflow-y-auto divide-y divide-border">
                          {feesProfile.invoices.map((inv: any) => (
                            <div key={inv.id} className="p-2.5 flex items-center justify-between">
                              <div>
                                <span className="font-mono font-bold text-primary">
                                  #{inv.invoiceNumber}
                                </span>
                                <span className="text-muted-foreground ml-2 text-[10px]">
                                  Due: {new Date(inv.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-foreground">
                                  ${inv.totalAmount.toLocaleString()}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    inv.status === 'PAID'
                                      ? 'bg-emerald-500/10 text-emerald-600'
                                      : inv.status === 'PARTIALLY_PAID'
                                      ? 'bg-blue-500/10 text-blue-600'
                                      : inv.status === 'OVERDUE'
                                      ? 'bg-rose-500/10 text-rose-600'
                                      : 'bg-amber-500/10 text-amber-600'
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Receipts / Payments */}
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="p-2.5 bg-muted/40 font-semibold text-foreground text-[11px]">
                        Payment Receipts ({feesProfile.payments.length})
                      </div>
                      {feesProfile.payments.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-[11px]">
                          No payment receipts recorded.
                        </div>
                      ) : (
                        <div className="max-h-32 overflow-y-auto divide-y divide-border">
                          {feesProfile.payments.map((pmt: any) => (
                            <div key={pmt.id} className="p-2.5 flex items-center justify-between">
                              <div>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {pmt.receiptNumber}
                                </span>
                                <span className="text-muted-foreground ml-2 text-[10px]">
                                  {new Date(pmt.paymentDate).toLocaleDateString()} &bull; {pmt.paymentMethod}
                                </span>
                              </div>
                              <div className="font-mono font-bold text-foreground">
                                ${pmt.amount.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setViewStudent(null);
                  setProfileTab('overview');
                }}
                className="w-full py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* INVITATION MODAL */}
      {/* --------------------------------------------------------------------- */}
      {isInviteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Invite Institutional User
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Generates a secure, single-use activation token.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {inviteError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteResult ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Invitation Dispatched
                  </div>
                  <p className="text-xs text-muted-foreground">{inviteResult.message}</p>
                </div>

                {inviteResult.devActivationLink && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs space-y-2">
                    <div className="font-bold text-amber-700 dark:text-amber-400">
                      Development Activation Link
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Use this link directly to test account setup without an external email provider:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.devActivationLink}
                        className="flex-1 h-8 rounded border border-border bg-background px-2 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteResult.devActivationLink!);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="px-2.5 h-8 rounded bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1"
                      >
                        {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setInviteResult(null);
                    setIsInviteModalOpen(false);
                  }}
                  className="w-full py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="mt-5 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Role Category *
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value={UserRole.STUDENT}>Student</option>
                    <option value={UserRole.TEACHER}>Teacher</option>
                    <option value={UserRole.PARENT}>Parent / Guardian</option>
                    {effectiveRole === UserRole.PLATFORM_ADMIN && (
                      <option value={UserRole.SCHOOL_ADMIN}>School Administrator</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Invitee Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@institution.edu"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      First Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={inviteFirstName}
                      onChange={(e) => setInviteFirstName(e.target.value)}
                      placeholder="e.g. John"
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Last Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={inviteLastName}
                      onChange={(e) => setInviteLastName(e.target.value)}
                      placeholder="e.g. Smith"
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingInvite}
                    className="px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isSubmittingInvite ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        <span>Issue Invitation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
