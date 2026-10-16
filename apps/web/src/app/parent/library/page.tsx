'use client';

/**
 * MODULE: Parent Child Library & Reading Progress Portal (TASK 028)
 *
 * PURPOSE:
 * Guardian interface for tracking linked children's library borrowings, return due dates,
 * overdue warnings, and assessed library fines.
 *
 * SECURITY:
 * Strictly verifies guardian-child relationship.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { libraryApi } from '@/lib/library-api';
import { apiClient } from '@/lib/api-client';
import {
  BookMarked,
  BookOpen,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export default function ParentLibraryPage() {
  const { user } = useAuth();

  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [libraryData, setLibraryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChildren() {
      try {
        const res = await apiClient.get<any[]>('/parents/dashboard');
        const students = (res as any)?.children || (res as any)?.students || [];
        setChildren(students);
        if (students.length > 0 && !selectedChildId) {
          setSelectedChildId(students[0].id);
        }
      } catch (err) {
        console.error('Failed to load parent children for library:', err);
      } finally {
        setLoading(false);
      }
    }
    loadChildren();
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;

    async function loadChildLibrary() {
      try {
        const res = await libraryApi.getParentChildLibrary(selectedChildId);
        setLibraryData(res);
      } catch (err) {
        console.error('Failed to load child library details:', err);
        setLibraryData(null);
      }
    }
    loadChildLibrary();
  }, [selectedChildId]);

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground">Verifying guardian access and library records...</span>
      </div>
    );
  }

  const child = libraryData?.child;
  const activeLoans = libraryData?.activeLoans || [];
  const loanHistory = libraryData?.loanHistory || [];
  const fines = libraryData?.fines || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <BookMarked className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Child Library & Reading Tracker
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Monitor borrowed library books, return due dates & overdue notifications
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
          {activeLoans.length} Currently Borrowed
        </span>
      </div>

      {/* Child Selector */}
      {children.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Select Child:</span>
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChildId(c.id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                selectedChildId === c.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-foreground hover:bg-muted'
              }`}
            >
              {c.firstName} {c.lastName}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Checked Out Books */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Currently Borrowed ({activeLoans.length})
            </h2>
            <span className="text-[10px] text-muted-foreground">{child?.name}</span>
          </div>

          {activeLoans.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No library books currently checked out.
            </p>
          ) : (
            <div className="divide-y divide-border text-xs">
              {activeLoans.map((l: any) => {
                const isOverdue = l.status === 'OVERDUE' || new Date(l.dueDate) < new Date();
                return (
                  <div key={l.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-foreground block">{l.book?.title}</span>
                      <p className="text-[11px] text-muted-foreground">Author: {l.book?.author}</p>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span>Issued: {new Date(l.issueDate).toLocaleDateString()}</span>
                        <span>
                          Due:{' '}
                          <span className={`font-bold ${isOverdue ? 'text-red-500' : 'text-foreground'}`}>
                            {new Date(l.dueDate).toLocaleDateString()}
                          </span>
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isOverdue
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isOverdue ? 'Overdue' : 'Active'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fines & Dues */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              Library Fines & Invoices
            </h2>
          </div>

          {fines.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No outstanding fines for this student.
            </div>
          ) : (
            <div className="divide-y divide-border text-xs">
              {fines.map((f: any) => (
                <div key={f.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-foreground block">
                      Late Return Fee ({f.overdueDays} days late)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Assessed: {f.amount} SAR (Balance Due: {f.balanceAmount} SAR)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400">
                    {f.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
