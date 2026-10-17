'use client';

/**
 * MODULE: Institutional Library Management Dashboard (TASK 028)
 *
 * PURPOSE:
 * Central library catalog, physical copy inventory, circulation desk (issue, return, renew),
 * reservation queue, fine waivers, borrowing policies, and analytical reports.
 *
 * SECURITY:
 * Multi-school tenant isolation. Authorizes Platform and School Administrators.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { libraryApi } from '@/lib/library-api';
import { apiClient } from '@/lib/api-client';
import {
  BookMarked,
  BookOpen,
  Library,
  Users,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Tag,
  DollarSign,
  FileText,
  X,
  Loader2,
  Bookmark,
  Check,
  AlertCircle,
} from 'lucide-react';

export default function LibraryManagementPage() {
  const { user, effectiveRole } = useAuth();
  const isAuthorized =
    effectiveRole === UserRole.PLATFORM_ADMIN || effectiveRole === UserRole.SCHOOL_ADMIN;

  const [activeTab, setActiveTab] = useState<
    'catalog' | 'copies' | 'loans' | 'reservations' | 'fines' | 'policies'
  >('catalog');

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Data states
  const [reports, setReports] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [copies, setCopies] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [borrowers, setBorrowers] = useState<any[]>([]);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isAddCopyOpen, setIsAddCopyOpen] = useState(false);
  const [isIssueBookOpen, setIsIssueBookOpen] = useState(false);
  const [isWaiveFineOpen, setIsWaiveFineOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState<any>(null);

  // Forms
  const [bookForm, setBookForm] = useState({
    title: '',
    isbn: '',
    author: '',
    publisher: '',
    category: 'Science',
    subject: '',
    language: 'English',
    edition: '1st Edition',
    publicationYear: 2024,
    description: '',
  });

  const [copyForm, setCopyForm] = useState({
    bookId: '',
    accessionNumber: '',
    barcode: '',
    shelfLocation: 'Stack A-Shelf 1',
    condition: 'EXCELLENT',
  });

  const [issueForm, setIssueForm] = useState({
    copyId: '',
    borrowerId: '',
    borrowerType: 'STUDENT',
    dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
    notes: '',
  });

  const [waiveForm, setWaiveForm] = useState({
    reason: '',
    waiveAmount: 0,
  });

  // Load initial library data
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [repRes, bRes, cRes, fRes, pRes] = await Promise.all([
          libraryApi.getReports().catch(() => null),
          libraryApi.getBooks().catch(() => []),
          libraryApi.getCopies().catch(() => []),
          libraryApi.getFines().catch(() => []),
          libraryApi.getPolicies().catch(() => []),
        ]);

        if (mounted) {
          setReports(repRes);
          setBooks(bRes || []);
          setCopies(cRes || []);
          setFines(fRes || []);
          setPolicies(pRes || []);
        }

        // Fetch students/borrowers for issuing desk
        try {
          const studentsRes = await apiClient.get<any[]>('/students');
          if (mounted && studentsRes) setBorrowers(studentsRes);
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('Failed to load library data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  // Handle Add Book
  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await libraryApi.createBook({
        title: bookForm.title,
        isbn: bookForm.isbn || undefined,
        author: bookForm.author,
        publisher: bookForm.publisher || undefined,
        category: bookForm.category,
        subject: bookForm.subject || undefined,
        language: bookForm.language,
        edition: bookForm.edition || undefined,
        publicationYear: Number(bookForm.publicationYear) || undefined,
        description: bookForm.description || undefined,
      });
      setIsAddBookOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to create book title');
    }
  };

  // Handle Add Copy
  const handleCreateCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await libraryApi.createCopy({
        bookId: copyForm.bookId,
        accessionNumber: copyForm.accessionNumber,
        barcode: copyForm.barcode || undefined,
        shelfLocation: copyForm.shelfLocation || undefined,
        condition: copyForm.condition as any,
      });
      setIsAddCopyOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to add copy');
    }
  };

  // Handle Issue Book
  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await libraryApi.issueBook({
        copyId: issueForm.copyId,
        borrowerId: issueForm.borrowerId,
        borrowerType: issueForm.borrowerType as any,
        dueDate: issueForm.dueDate,
        notes: issueForm.notes || undefined,
      });
      setIsIssueBookOpen(false);
      setRefreshKey((k) => k + 1);
      alert('Book issued successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to issue book');
    }
  };

  // Handle Return Book
  const handleReturnBook = async (loanId: string) => {
    if (!confirm('Confirm return of this book copy to library inventory?')) return;
    try {
      await libraryApi.returnBook({
        loanId,
        returnCondition: 'GOOD',
      });
      setRefreshKey((k) => k + 1);
      alert('Book returned successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to return book');
    }
  };

  // Handle Waive Fine
  const handleWaiveFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFine) return;
    try {
      await libraryApi.waiveFine({
        fineId: selectedFine.id,
        reason: waiveForm.reason,
        waiveAmount: Number(waiveForm.waiveAmount) || undefined,
      });
      setIsWaiveFineOpen(false);
      setSelectedFine(null);
      setRefreshKey((k) => k + 1);
      alert('Fine waived successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to waive fine');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border border-border shadow-sm max-w-lg mx-auto mt-20">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground text-sm mt-2">
          Library management is restricted to authorized Platform and School Administrators.
        </p>
      </div>
    );
  }

  // Extract all loans across books
  const allLoans: any[] = [];
  books.forEach((b) => {
    if (b.loans) {
      b.loans.forEach((l: any) => {
        allLoans.push({ ...l, bookTitle: b.title });
      });
    }
  });

  // Extract all reservations across books
  const allReservations: any[] = [];
  books.forEach((b) => {
    if (b.reservations) {
      b.reservations.forEach((r: any) => {
        allReservations.push({ ...r, bookTitle: b.title });
      });
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <BookMarked className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Library & Catalog Management
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Book titles, physical copy inventory, circulation desk, reservations & fine management
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-xl hover:bg-muted transition text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setIsAddBookOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Book Title
          </button>

          <button
            onClick={() => setIsAddCopyOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl transition shadow-sm"
          >
            <Bookmark className="h-4 w-4 text-primary" />
            Add Copy
          </button>

          <button
            onClick={() => setIsIssueBookOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-sm"
          >
            <ArrowRight className="h-4 w-4" />
            Issue Book
          </button>
        </div>
      </div>

      {/* Reports & Metrics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Catalog Titles</span>
            <BookMarked className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {reports?.totalBookTitles ?? books.length}
          </div>
          <span className="text-[11px] text-muted-foreground">Unique Titles</span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Total Copies</span>
            <Bookmark className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {reports?.totalCopies ?? copies.length}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {reports?.availableCopies ?? copies.filter((c) => c.status === 'AVAILABLE').length} Available
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Issued Loans</span>
            <ArrowRight className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {reports?.issuedCopies ?? copies.filter((c) => c.status === 'ISSUED').length}
          </div>
          <span className="text-[11px] text-muted-foreground">In Circulation</span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Overdue Books</span>
            <Clock className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">
            {reports?.overdueBooks ?? allLoans.filter((l) => l.status === 'OVERDUE').length}
          </div>
          <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
            Due Date Passed
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Reservations</span>
            <Users className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {reports?.activeReservations ?? allReservations.length}
          </div>
          <span className="text-[11px] text-muted-foreground">Queue Holds</span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Unpaid Fines</span>
            <DollarSign className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {reports?.outstandingFines ? `${reports.outstandingFines} SAR` : '0 SAR'}
          </div>
          <span className="text-[11px] text-muted-foreground">Receivables</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {[
          { id: 'catalog', label: 'Book Catalog', icon: BookMarked, count: books.length },
          { id: 'copies', label: 'Physical Copies', icon: Bookmark, count: copies.length },
          { id: 'loans', label: 'Circulation Desk (Loans)', icon: ArrowRight, count: allLoans.length },
          { id: 'reservations', label: 'Reservations Queue', icon: Clock, count: allReservations.length },
          { id: 'fines', label: 'Overdue Fines', icon: DollarSign, count: fines.length },
          { id: 'policies', label: 'Borrowing Policies', icon: ShieldCheck, count: policies.length },
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

      {/* Tab 1: Book Catalog */}
      {activeTab === 'catalog' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search title, author, or ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/40 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
              >
                <option value="ALL">All Categories</option>
                <option value="Science">Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="History">History</option>
                <option value="Literature">Literature</option>
                <option value="Computer Science">Computer Science</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Book Title</th>
                  <th className="p-3.5">Author</th>
                  <th className="p-3.5">ISBN</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Available Copies</th>
                  <th className="p-3.5">Language</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {books
                  .filter((b) => {
                    const matchQ =
                      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (b.isbn && b.isbn.toLowerCase().includes(searchQuery.toLowerCase()));
                    const matchC = categoryFilter === 'ALL' || b.category === categoryFilter;
                    return matchQ && matchC;
                  })
                  .map((b) => (
                    <tr key={b.id} className="hover:bg-muted/20 transition">
                      <td className="p-3.5 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary shrink-0" />
                          <span>{b.title}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-medium text-foreground">{b.author}</td>
                      <td className="p-3.5 font-mono text-muted-foreground">{b.isbn || '—'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-medium">
                          {b.category}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {b.availableCopies} / {b.totalCopies}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground">{b.language}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setCopyForm({ ...copyForm, bookId: b.id });
                            setIsAddCopyOpen(true);
                          }}
                          className="text-xs text-primary font-semibold hover:underline"
                        >
                          + Add Copy
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Physical Copies */}
      {activeTab === 'copies' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Physical Book Inventory</h2>
            <button
              onClick={() => setIsAddCopyOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Physical Copy
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Accession Number</th>
                  <th className="p-3.5">Book Title</th>
                  <th className="p-3.5">Shelf Location</th>
                  <th className="p-3.5">Physical Condition</th>
                  <th className="p-3.5">Circulation Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {copies.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition">
                    <td className="p-3.5 font-mono font-bold text-primary">{c.accessionNumber}</td>
                    <td className="p-3.5 font-bold text-foreground">{c.book?.title}</td>
                    <td className="p-3.5 text-muted-foreground">{c.shelfLocation || 'Main Stacks'}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                        {c.condition}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.status === 'AVAILABLE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : c.status === 'ISSUED'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {c.status === 'AVAILABLE' && (
                        <button
                          onClick={() => {
                            setIssueForm({ ...issueForm, copyId: c.id });
                            setIsIssueBookOpen(true);
                          }}
                          className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                        >
                          Issue
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Circulation Desk (Active Loans) */}
      {activeTab === 'loans' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Active Circulation & Loans</h2>
              <p className="text-xs text-muted-foreground">
                Track borrowed volumes, return check-ins, renewals, and overdue limits.
              </p>
            </div>
            <button
              onClick={() => setIsIssueBookOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" />
              Issue Book
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Book Title</th>
                  <th className="p-3.5">Borrower</th>
                  <th className="p-3.5">Issue Date</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5">Renewals</th>
                  <th className="p-3.5">Loan Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allLoans.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/20 transition">
                    <td className="p-3.5 font-bold text-foreground">{l.bookTitle}</td>
                    <td className="p-3.5 font-semibold text-foreground">
                      {l.borrower?.firstName} {l.borrower?.lastName}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {new Date(l.issueDate).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 font-medium text-foreground">
                      {new Date(l.dueDate).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-muted-foreground">{l.renewCount}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          l.status === 'ISSUED'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : l.status === 'RETURNED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {l.status !== 'RETURNED' && (
                        <button
                          onClick={() => handleReturnBook(l.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition"
                        >
                          Check In (Return)
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Reservations Queue */}
      {activeTab === 'reservations' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-bold text-foreground">Hold & Reservation Queue</h2>
            <p className="text-xs text-muted-foreground">
              Borrower reservation holds are queued in chronological priority order.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Queue Priority</th>
                  <th className="p-3.5">Book Title</th>
                  <th className="p-3.5">Borrower</th>
                  <th className="p-3.5">Reservation Date</th>
                  <th className="p-3.5">Hold Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allReservations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No active reservations in queue.
                    </td>
                  </tr>
                ) : (
                  allReservations.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-muted/20 transition">
                      <td className="p-3.5 font-bold text-primary font-mono">#{r.queuePosition}</td>
                      <td className="p-3.5 font-bold text-foreground">{r.bookTitle}</td>
                      <td className="p-3.5 text-foreground">
                        {r.borrower?.firstName} {r.borrower?.lastName}
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {new Date(r.reservationDate).toLocaleDateString()}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Overdue Fines */}
      {activeTab === 'fines' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Overdue Fines & Penalty Management</h2>
              <p className="text-xs text-muted-foreground">
                Configured daily penalty rates accrue automatically until check-in. Authorized admins can waive fines.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Borrower</th>
                  <th className="p-3.5">Overdue Days</th>
                  <th className="p-3.5">Assessed Fine</th>
                  <th className="p-3.5">Waived</th>
                  <th className="p-3.5">Balance Due</th>
                  <th className="p-3.5">Fine Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No outstanding library fines.
                    </td>
                  </tr>
                ) : (
                  fines.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/20 transition">
                      <td className="p-3.5 font-bold text-foreground">
                        {f.borrower?.firstName} {f.borrower?.lastName}
                      </td>
                      <td className="p-3.5 font-bold text-red-600 dark:text-red-400">
                        {f.overdueDays} days
                      </td>
                      <td className="p-3.5 font-semibold text-foreground">{f.amount} SAR</td>
                      <td className="p-3.5 text-muted-foreground">{f.waivedAmount} SAR</td>
                      <td className="p-3.5 font-bold text-foreground">{f.balanceAmount} SAR</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            f.status === 'UNPAID'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                              : f.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {f.status === 'UNPAID' && (
                          <button
                            onClick={() => {
                              setSelectedFine(f);
                              setWaiveForm({ reason: '', waiveAmount: f.balanceAmount });
                              setIsWaiveFineOpen(true);
                            }}
                            className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                          >
                            Waive Fine
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Borrowing Policies */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((pol) => (
            <div
              key={pol.id}
              className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="font-bold text-foreground text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {pol.borrowerType} Borrowing Policy
                </span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  Active Rule
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Maximum Simultaneous Books:</span>
                  <span className="font-bold text-foreground">{pol.maxBooks} volumes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Standard Loan Period:</span>
                  <span className="font-bold text-foreground">{pol.loanPeriodDays} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Permitted Renewal Limit:</span>
                  <span className="font-bold text-foreground">{pol.renewalLimit} times</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Overdue Fine Rate:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {pol.finePerDay} SAR / day
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Grace Period:</span>
                  <span className="font-bold text-foreground">{pol.gracePeriodDays} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Maximum Fine Ceiling:</span>
                  <span className="font-bold text-foreground">{pol.maxFineAmount} SAR</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Add Book */}
      {isAddBookOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-primary" />
                Add Catalog Book Title
              </h3>
              <button
                onClick={() => setIsAddBookOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Organic Chemistry"
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Author *</label>
                  <input
                    type="text"
                    required
                    placeholder="Author full name"
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">ISBN</label>
                  <input
                    type="text"
                    placeholder="978-xxxxxxxxxx"
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Category *</label>
                  <select
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  >
                    <option value="Science">Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="History">History</option>
                    <option value="Literature">Literature</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Language</label>
                  <input
                    type="text"
                    value={bookForm.language}
                    onChange={(e) => setBookForm({ ...bookForm, language: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddBookOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl"
                >
                  Save Book Title
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Copy */}
      {isAddCopyOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-primary" />
                Add Physical Book Copy
              </h3>
              <button
                onClick={() => setIsAddCopyOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCopy} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Select Book Title *</label>
                <select
                  required
                  value={copyForm.bookId}
                  onChange={(e) => setCopyForm({ ...copyForm, bookId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                >
                  <option value="">Select book title...</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Accession Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ACC-SCI-1099"
                  value={copyForm.accessionNumber}
                  onChange={(e) => setCopyForm({ ...copyForm, accessionNumber: e.target.value })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Shelf Location</label>
                  <input
                    type="text"
                    placeholder="Stack B-Shelf 3"
                    value={copyForm.shelfLocation}
                    onChange={(e) => setCopyForm({ ...copyForm, shelfLocation: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Physical Condition</label>
                  <select
                    value={copyForm.condition}
                    onChange={(e) => setCopyForm({ ...copyForm, condition: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddCopyOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl"
                >
                  Register Copy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Issue Book */}
      {isIssueBookOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-emerald-500" />
                Issue Book Loan
              </h3>
              <button
                onClick={() => setIsIssueBookOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleIssueBook} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Select Available Copy *</label>
                <select
                  required
                  value={issueForm.copyId}
                  onChange={(e) => setIssueForm({ ...issueForm, copyId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                >
                  <option value="">Select physical copy...</option>
                  {copies
                    .filter((c) => c.status === 'AVAILABLE')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.accessionNumber} - {c.book?.title} ({c.shelfLocation || 'Stacks'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Borrower Student *</label>
                <select
                  required
                  value={issueForm.borrowerId}
                  onChange={(e) => setIssueForm({ ...issueForm, borrowerId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                >
                  <option value="">Select borrower...</option>
                  {borrowers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.firstName} {b.lastName} ({b.studentIdNumber || b.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Scheduled Return Due Date *</label>
                <input
                  type="date"
                  required
                  value={issueForm.dueDate}
                  onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsIssueBookOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Waive Fine */}
      {isWaiveFineOpen && selectedFine && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-500" />
                Waive Library Fine
              </h3>
              <button
                onClick={() => setIsWaiveFineOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleWaiveFine} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Borrower</label>
                <div className="p-2 bg-muted/40 rounded-xl font-bold">
                  {selectedFine.borrower?.firstName} {selectedFine.borrower?.lastName} (Overdue:{' '}
                  {selectedFine.overdueDays} days)
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Waive Amount (SAR) *</label>
                <input
                  type="number"
                  min="0"
                  max={selectedFine.balanceAmount}
                  required
                  value={waiveForm.waiveAmount}
                  onChange={(e) => setWaiveForm({ ...waiveForm, waiveAmount: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Authorized Justification *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Reason for administrative waiver..."
                  value={waiveForm.reason}
                  onChange={(e) => setWaiveForm({ ...waiveForm, reason: e.target.value })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsWaiveFineOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
                >
                  Confirm Waiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
