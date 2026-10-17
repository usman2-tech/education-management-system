'use client';

/**
 * MODULE: Parent & Guardian Profile & Student Linking
 *
 * PURPOSE:
 * Displays single guardian profile, enables linking enrolled students,
 * managing relationship verification lifecycles, and primary contact flags.
 *
 * SECURITY:
 * Only authorized School Admins and Platform Admins can link/verify/revoke relationships.
 * Parents can only view their own verified children.
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  ParentGuardianDto,
  UserRole,
  GuardianRelationshipType,
  RelationshipVerificationStatus,
} from '@ems/contracts';
import {
  fetchParentById,
  linkStudentToParent,
  verifyRelationship,
} from '@/lib/parents-api';
import {
  Users,
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MapPin,
  GraduationCap,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Edit,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export default function ParentDetailPage() {
  const params = useParams();
  const parentId = params?.id as string;
  const router = useRouter();
  const { effectiveRole } = useAuth();
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const [parent, setParent] = React.useState<ParentGuardianDto | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Link Student Modal State
  const [isLinkingOpen, setIsLinkingOpen] = React.useState(false);
  const [studentId, setStudentId] = React.useState('');
  const [relationshipType, setRelationshipType] = React.useState<GuardianRelationshipType>(
    GuardianRelationshipType.MOTHER,
  );
  const [isPrimaryContact, setIsPrimaryContact] = React.useState(false);
  const [isEmergencyContact, setIsEmergencyContact] = React.useState(true);
  const [notes, setNotes] = React.useState('');
  const [isSubmittingLink, setIsSubmittingLink] = React.useState(false);
  const [linkError, setLinkError] = React.useState<string | null>(null);

  const loadParent = React.useCallback(async () => {
    if (!parentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchParentById(parentId);
      setParent(data);
    } catch (err: any) {
      console.error('Failed to load parent:', err);
      setError(err.message || 'Failed to retrieve guardian record.');
    } finally {
      setIsLoading(false);
    }
  }, [parentId]);

  React.useEffect(() => {
    loadParent();
  }, [loadParent]);

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      setLinkError('Please provide the Student ID or user UUID.');
      return;
    }

    setIsSubmittingLink(true);
    setLinkError(null);
    try {
      await linkStudentToParent(parentId, {
        studentId: studentId.trim(),
        relationshipType,
        isPrimaryContact,
        isEmergencyContact,
        notes: notes.trim() || undefined,
      });

      setIsLinkingOpen(false);
      setStudentId('');
      setNotes('');
      await loadParent();
    } catch (err: any) {
      console.error('Failed to link student:', err);
      setLinkError(err.message || 'Failed to establish relationship.');
    } finally {
      setIsSubmittingLink(false);
    }
  };

  const handleUpdateStatus = async (
    targetStudentId: string,
    newStatus: RelationshipVerificationStatus,
  ) => {
    try {
      await verifyRelationship(parentId, targetStudentId, {
        verificationStatus: newStatus,
      });
      await loadParent();
    } catch (err: any) {
      alert(err.message || 'Failed to update relationship verification status.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Loading guardian record...</p>
      </div>
    );
  }

  if (error || !parent) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
          {error || 'Parent record not found.'}
        </div>
        <Link
          href="/parents"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Parents Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/parents"
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {parent.firstName} {parent.lastName}
              {parent.isActive ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                  Active
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium">
                  Inactive
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {parent.profile?.relationshipToFamily || 'Parent'} •{' '}
              {parent.profile?.occupation || 'Guardian'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              href={`/parents/${parent.id}/edit`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-sm font-medium transition"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </Link>
            <button
              onClick={() => setIsLinkingOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Link Student
            </button>
          </div>
        )}
      </div>

      {/* Profile Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 p-6 rounded-2xl border border-border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl border border-primary/20">
              {parent.firstName[0]}
              {parent.lastName[0]}
            </div>
            <div>
              <h2 className="font-bold text-foreground">
                {parent.firstName} {parent.lastName}
              </h2>
              <p className="text-xs text-muted-foreground">Guardian ID: {parent.id.slice(0, 8)}...</p>
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4 text-primary/70 flex-shrink-0" />
              <span className="text-foreground select-all">{parent.email}</span>
            </div>

            {parent.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 text-primary/70 flex-shrink-0" />
                <span className="text-foreground">{parent.phone}</span>
              </div>
            )}

            {parent.profile?.phoneAlt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 text-amber-500/70 flex-shrink-0" />
                <span className="text-foreground">Alt: {parent.profile.phoneAlt}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="w-4 h-4 text-primary/70 flex-shrink-0" />
              <span className="text-foreground">
                {parent.primarySchool?.name || 'Assigned Institutional School'}
              </span>
            </div>

            {parent.profile?.employer && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-4 h-4 text-primary/70 flex-shrink-0" />
                <span className="text-foreground">{parent.profile.employer}</span>
              </div>
            )}

            {parent.profile?.address && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary/70 flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{parent.profile.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Linked Children / Students Roster */}
        <div className="md:col-span-2 p-6 rounded-2xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-foreground">Linked Students & Wards</h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
              {parent.linkedStudents.length} Children Linked
            </span>
          </div>

          {parent.linkedStudents.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-border p-6 space-y-2">
              <GraduationCap className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No students are currently linked to this guardian.</p>
              <p className="text-xs text-muted-foreground">
                Click &quot;Link Student&quot; above to connect an enrolled student with this family profile.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {parent.linkedStudents.map((child) => (
                <div
                  key={child.id}
                  className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {child.firstName} {child.lastName}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {child.relationshipType}
                      </span>
                      {child.isPrimaryContact && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                          Primary
                        </span>
                      )}
                      {child.isEmergencyContact && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                          Emergency
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Admission: {child.admissionNumber || 'N/A'}</span>
                      <span>•</span>
                      <span>
                        {child.currentSection
                          ? `${child.currentSection.className} - ${child.currentSection.name}`
                          : 'Not assigned to section'}
                      </span>
                      <span>•</span>
                      <span>{child.schoolName || 'St. Jude Academy'}</span>
                    </div>

                    {child.notes && (
                      <p className="text-xs text-muted-foreground/80 italic pt-1">
                        Note: {child.notes}
                      </p>
                    )}
                  </div>

                  {/* Verification Controls */}
                  <div className="flex items-center gap-2 sm:self-center">
                    {child.verificationStatus === RelationshipVerificationStatus.VERIFIED ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(child.id, RelationshipVerificationStatus.REVOKED)
                            }
                            className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-medium transition"
                            title="Revoke access immediately"
                          >
                            Revoke
                          </button>
                        )}
                      </>
                    ) : child.verificationStatus === RelationshipVerificationStatus.PENDING_VERIFICATION ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Pending
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(child.id, RelationshipVerificationStatus.VERIFIED)
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition"
                          >
                            Verify Link
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3.5 h-3.5" />
                          Revoked
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(child.id, RelationshipVerificationStatus.VERIFIED)
                            }
                            className="px-2.5 py-1 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-medium transition"
                          >
                            Re-Verify
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Link Student Modal Dialog */}
      {isLinkingOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Link Student to Guardian</h3>
              </div>
              <button
                onClick={() => setIsLinkingOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {linkError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                {linkError}
              </div>
            )}

            <form onSubmit={handleLinkSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Student User ID / UUID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Paste student UUID or email"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Relationship Type
                </label>
                <select
                  value={relationshipType}
                  onChange={(e) =>
                    setRelationshipType(e.target.value as GuardianRelationshipType)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                >
                  <option value={GuardianRelationshipType.MOTHER}>Mother</option>
                  <option value={GuardianRelationshipType.FATHER}>Father</option>
                  <option value={GuardianRelationshipType.LEGAL_GUARDIAN}>Legal Guardian</option>
                  <option value={GuardianRelationshipType.STEP_PARENT}>Step-Parent</option>
                  <option value={GuardianRelationshipType.OTHER}>Other</option>
                </select>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimaryContact}
                    onChange={(e) => setIsPrimaryContact(e.target.checked)}
                    className="rounded border-border"
                  />
                  Primary Contact
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEmergencyContact}
                    onChange={(e) => setIsEmergencyContact(e.target.checked)}
                    className="rounded border-border"
                  />
                  Emergency Contact
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Administrative Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified by parent identity document."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsLinkingOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-border hover:bg-muted text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLink}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
                >
                  {isSubmittingLink ? 'Linking...' : 'Establish Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
