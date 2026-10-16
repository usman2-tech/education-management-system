'use client';

/**
 * MODULE: Teacher Faculty Library Portal (TASK 028)
 *
 * PURPOSE:
 * Teacher portal to browse the educational catalog, reserve instructional literature,
 * inspect personal borrowing loans, and track due dates based on faculty policy.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { libraryApi } from '@/lib/library-api';
import {
  BookMarked,
  BookOpen,
  Search,
  Bookmark,
  Clock,
  CheckCircle2,
  Calendar,
  Loader2,
} from 'lucide-react';

export default function TeacherLibraryPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'catalog' | 'my-loans'>('catalog');
  const [books, setBooks] = useState<any[]>([]);
  const [myLoansData, setMyLoansData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [bRes, lRes] = await Promise.all([
          libraryApi.getBooks(),
          libraryApi.getMyLoans().catch(() => null),
        ]);
        setBooks(bRes || []);
        setMyLoansData(lRes);
      } catch (err) {
        console.error('Failed to load faculty library:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleReserve = async (bookId: string) => {
    try {
      await libraryApi.createReservation({ bookId });
      alert('Hold reservation registered successfully.');
      const updated = await libraryApi.getMyLoans();
      setMyLoansData(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to reserve book');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground">Loading faculty library catalog...</span>
      </div>
    );
  }

  const activeLoans = myLoansData?.activeLoans || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <BookMarked className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Faculty Library & Teaching References
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Extended faculty loan limits (30-day loans, up to 8 books) for pedagogical research
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold">
          {activeLoans.length} Checked Out
        </span>
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'catalog'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Catalog Search ({books.length})
        </button>
        <button
          onClick={() => setActiveTab('my-loans')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition ${
            activeTab === 'my-loans'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <BookMarked className="h-3.5 w-3.5" />
          My Faculty Loans ({activeLoans.length})
        </button>
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search instructional textbooks and reference manuals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {books
              .filter(
                (b) =>
                  b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  b.author.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((b) => (
                <div
                  key={b.id}
                  className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                        {b.category}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        {b.availableCopies} available
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{b.title}</h3>
                    <p className="text-xs text-muted-foreground">Author: {b.author}</p>
                    {b.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{b.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-[10px] text-muted-foreground font-mono">ISBN: {b.isbn || '—'}</span>
                    <button
                      onClick={() => handleReserve(b.id)}
                      className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition"
                    >
                      Reserve Hold
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === 'my-loans' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border font-bold text-sm text-foreground">
            Current Faculty Loans
          </div>

          {activeLoans.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              You do not have any active books borrowed.
            </div>
          ) : (
            <div className="divide-y divide-border text-xs">
              {activeLoans.map((l: any) => (
                <div key={l.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="font-bold text-foreground text-sm block">{l.book?.title}</span>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                      <span>Borrowed: {new Date(l.issueDate).toLocaleDateString()}</span>
                      <span>Due: {new Date(l.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Active Faculty Loan
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
