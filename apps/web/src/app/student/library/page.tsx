'use client';

/**
 * MODULE: Student Library & Reading Portal (TASK 028)
 *
 * PURPOSE:
 * Student portal to search the institutional catalog, reserve titles,
 * inspect borrowed volumes, review return due dates, and track any assessed fines.
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
  AlertTriangle,
  Calendar,
  Loader2,
  DollarSign,
  Tag,
} from 'lucide-react';

export default function StudentLibraryPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'catalog' | 'my-loans' | 'reservations' | 'fines'>('catalog');
  const [books, setBooks] = useState<any[]>([]);
  const [myLoansData, setMyLoansData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

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
        console.error('Failed to load student library:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleReserve = async (bookId: string) => {
    try {
      await libraryApi.createReservation({ bookId });
      alert('Reservation hold requested successfully!');
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
        <span className="text-sm text-muted-foreground">Loading library catalog & your loans...</span>
      </div>
    );
  }

  const activeLoans = myLoansData?.activeLoans || [];
  const loanHistory = myLoansData?.loanHistory || [];
  const reservations = myLoansData?.reservations || [];
  const fines = myLoansData?.fines || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <BookMarked className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Student Library Portal</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse textbooks & classical literature, manage personal loans & hold reservations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
            {activeLoans.length} Active Borrowed Books
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { id: 'catalog', label: 'Book Catalog', icon: BookOpen, count: books.length },
          { id: 'my-loans', label: 'My Borrowed Books', icon: BookMarked, count: activeLoans.length },
          { id: 'reservations', label: 'My Reservations', icon: Clock, count: reservations.length },
          { id: 'fines', label: 'Fines & Dues', icon: DollarSign, count: fines.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Catalog Search */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search catalog by title, subject, or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-card border border-border rounded-xl text-foreground focus:outline-hidden"
            >
              <option value="ALL">All Categories</option>
              <option value="Science">Science</option>
              <option value="Mathematics">Mathematics</option>
              <option value="History">History</option>
              <option value="Literature">Literature</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {books
              .filter((b) => {
                const matchQ =
                  b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  b.author.toLowerCase().includes(searchQuery.toLowerCase());
                const matchC = categoryFilter === 'ALL' || b.category === categoryFilter;
                return matchQ && matchC;
              })
              .map((b) => (
                <div
                  key={b.id}
                  className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                        {b.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.availableCopies > 0
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {b.availableCopies > 0 ? `${b.availableCopies} Copies Available` : 'Reserved / Checked Out'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground">{b.title}</h3>
                    <p className="text-xs text-muted-foreground font-medium">By {b.author}</p>
                    {b.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{b.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground text-[10px]">Edition: {b.edition || 'Standard'}</span>
                    <button
                      onClick={() => handleReserve(b.id)}
                      className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-xs transition text-xs"
                    >
                      Reserve Hold
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* My Loans */}
      {activeTab === 'my-loans' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-bold text-foreground">Currently Checked Out Volumes</h2>
          </div>

          {activeLoans.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              You do not have any borrowed books currently checked out.
            </div>
          ) : (
            <div className="divide-y divide-border text-xs">
              {activeLoans.map((loan: any) => {
                const isOverdue = loan.status === 'OVERDUE' || new Date(loan.dueDate) < new Date();
                return (
                  <div key={loan.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="font-bold text-foreground text-sm block">
                        {loan.book?.title}
                      </span>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                        <span>Issued: {new Date(loan.issueDate).toLocaleDateString()}</span>
                        <span>
                          Due Date:{' '}
                          <span className={`font-bold ${isOverdue ? 'text-red-500' : 'text-foreground'}`}>
                            {new Date(loan.dueDate).toLocaleDateString()}
                          </span>
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        isOverdue
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isOverdue ? 'Overdue' : 'Active Loan'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* My Reservations */}
      {activeTab === 'reservations' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-bold text-foreground">My Hold Reservations</h2>
          </div>

          {reservations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              You have no active hold reservations.
            </div>
          ) : (
            <div className="divide-y divide-border text-xs">
              {reservations.map((r: any) => (
                <div key={r.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="font-bold text-foreground text-sm block">
                      {r.book?.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Reserved on {new Date(r.reservationDate).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    Queue #{r.queuePosition} ({r.status})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fines */}
      {activeTab === 'fines' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-bold text-foreground">Assessed Library Overdue Fines</h2>
          </div>

          {fines.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No outstanding library fines. Keep returning books on time!
            </div>
          ) : (
            <div className="divide-y divide-border text-xs">
              {fines.map((f: any) => (
                <div key={f.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-foreground block">
                      Overdue Fine ({f.overdueDays} days late)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Assessed fine: {f.amount} SAR
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-base text-red-600 dark:text-red-400 block">
                      {f.balanceAmount} SAR
                    </span>
                    <span className="text-[10px] text-muted-foreground">{f.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
