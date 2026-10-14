'use client';

/**
 * MODULE: Institutional Student Directory
 *
 * PURPOSE:
 * School-authorized student enrollment roster. Allows School Administrators
 * and Faculty to search, inspect academic profiles, attendance history,
 * and grade records for enrolled students.
 *
 * SECURITY:
 * Strict school-level tenant scoping enforced on backend.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
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
} from 'lucide-react';

interface StudentItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  admissionNumber?: string | null;
  gradeLevel?: string | null;
  section?: {
    id: string;
    name: string;
    className: string;
  } | null;
  createdAt: string;
}

export default function StudentsDirectoryPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadStudents() {
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
    }

    const timer = setTimeout(() => {
      loadStudents();
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

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
            and academic records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/classes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Class Sections
          </Link>
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <Clock className="h-3.5 w-3.5" />
            Attendance Registers
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          Showing {students.length} student{students.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-medium">Loading student enrollment records...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center text-xs text-rose-600">
          {error}
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-2">
          <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-sm font-semibold text-foreground">No Students Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No enrolled students match your search query for this institutional school tenant.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4 font-semibold">Student Name</th>
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
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px]">
                        {student.firstName[0]}
                        {student.lastName[0]}
                      </div>
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
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/grades/students/${student.id}`}
                        title="View Report Card"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      >
                        <Award className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/attendance/students/${student.id}`}
                        title="Attendance Record"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      >
                        <Clock className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/messages?recipientId=${student.id}`}
                        title="Send Message"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
