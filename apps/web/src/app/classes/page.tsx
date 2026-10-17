'use client';

/**
 * MODULE: Institutional Classes & Sections Overview
 *
 * PURPOSE:
 * Academic structure listing of all school classes, levels, sections,
 * room numbers, and assigned class educators.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { SchoolClassDto, ClassSectionDto, UserRole } from '@ems/contracts';
import { fetchClasses, fetchSections } from '@/lib/classes-api';
import {
  BookOpen,
  Plus,
  Users,
  Building2,
  ChevronRight,
  GraduationCap,
  Loader2,
  AlertCircle,
  Eye,
  Layers,
} from 'lucide-react';

export default function ClassesPage() {
  const { effectiveRole } = useAuth();
  const isAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN;

  const [classes, setClasses] = React.useState<SchoolClassDto[]>([]);
  const [sections, setSections] = React.useState<ClassSectionDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [classesData, sectionsData] = await Promise.all([
        fetchClasses(),
        fetchSections(),
      ]);
      setClasses(classesData || []);
      setSections(sectionsData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load institutional class structures.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Classes & Sections
            </h1>
            <p className="text-sm text-muted-foreground">
              Curriculum grade levels, classroom sections, student rosters, and teacher allocations.
            </p>
          </div>
        </div>

        {isAdmin && (
          <Link
            href="/classes/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Class
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Classes Cards */}
      {isLoading ? (
        <div className="py-20 flex justify-center items-center text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Loading classes and sections...</span>
        </div>
      ) : classes.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card p-6 space-y-2">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <h3 className="font-bold text-foreground text-base">No Classes Created Yet</h3>
          <p className="text-xs text-muted-foreground">
            Define institutional classes (e.g. Grade 10) to organize sections and enroll students.
          </p>
          {isAdmin && (
            <Link
              href="/classes/new"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Class
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {classes.map((cls) => {
            const classSections = sections.filter((s) => s.classId === cls.id);

            return (
              <div
                key={cls.id}
                className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold text-foreground">{cls.name}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-md font-mono font-semibold bg-muted text-muted-foreground border border-border">
                        Code: {cls.code}
                      </span>
                    </div>
                    {cls.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{cls.description}</p>
                    )}
                  </div>

                  <Link
                    href={`/classes/${cls.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-foreground transition self-start sm:self-auto"
                  >
                    <span>Manage Roster & Sections</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Sections list inside this class */}
                <div className="pt-2 border-t border-border">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Sections ({classSections.length})
                  </h3>

                  {classSections.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No sections configured for this class. Click &quot;Manage Roster & Sections&quot; to add Section A.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {classSections.map((sec) => (
                        <div
                          key={sec.id}
                          className="p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground text-sm">{sec.name}</span>
                            <span className="text-[11px] font-medium text-muted-foreground">
                              Room: {sec.roomNumber || 'Not assigned'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/50">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-primary" />
                              {sec.enrolledStudentsCount} / {sec.capacity} Students
                            </span>
                            <span className="truncate max-w-[120px]">
                              {sec.classTeacher
                                ? `${sec.classTeacher.firstName} ${sec.classTeacher.lastName}`
                                : 'No Class Teacher'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
